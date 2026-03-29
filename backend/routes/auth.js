const express = require("express");
const bcrypt = require("bcrypt");
const authMiddleware = require("../middleware/authMiddleware");
const { sendError } = require("../utils/responses");
const { validateEmail, validatePassword } = require("../utils/validation");
const { logAuditEvent } = require("../utils/auditLogger");
const {
    buildUserToken,
    clearSessionCookie,
    createOpaqueToken,
    hashOpaqueToken,
    setSessionCookie
} = require("../utils/authSession");
const { admin, getDb, initializeFirebaseAdmin, isFirebaseConfigured } = require("../utils/firebaseAdmin");
require("dotenv").config();

initializeFirebaseAdmin();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const EMAIL_VERIFICATION_REQUIRED = (process.env.EMAIL_VERIFICATION_REQUIRED || "false").toLowerCase() === "true";

const db = () => getDb();

function issueSession(res, userId, passwordVersion) {
    const token = buildUserToken(userId, passwordVersion);
    setSessionCookie(res, token);
    return token;
}

function buildPublicUser(docId, data) {
    return {
        id: docId,
        email: data.email,
        name: data.name || "",
        avatar: data.avatar || "",
        emailVerified: Boolean(data.emailVerified),
        createdAt: data.createdAt
    };
}

// GOOGLE LOGIN — Only for registered users (lookup by email)
router.post("/google", async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) {
        return sendError(res, req, 400, "VALIDATION_ERROR", "idToken is required");
    }

    if (!isFirebaseConfigured()) {
        return sendError(res, req, 503, "GOOGLE_AUTH_DISABLED", "Google auth not configured on server");
    }

    let decoded;
    try {
        decoded = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
        console.error("[Google OAuth] Token verification failed:", err.code, err.message);
        return sendError(res, req, 401, "INVALID_GOOGLE_TOKEN", "Invalid Google token", { providerCode: err.code });
    }

    const { uid, email, name = "", picture = "" } = decoded;
    if (!email) {
        return sendError(res, req, 400, "VALIDATION_ERROR", "No email in Google account");
    }

    try {
        // Lookup user by EMAIL (not by Firebase UID)
        const snap = await db().collection("users").where("email", "==", email).limit(1).get();
        
        // ❌ User must be registered first — no auto-signup
        if (snap.empty) {
            logAuditEvent(req, "auth_google_login_denied_unregistered", { email });
            return sendError(res, req, 400, "USER_NOT_REGISTERED", "User not registered. Please sign up first.");
        }
        
        const doc = snap.docs[0];
        let userData = doc.data();
        const updates = {};
        if (!userData.googleId) updates.googleId = uid;
        if (!userData.name && name) updates.name = name;
        if (!userData.avatar && picture) updates.avatar = picture;
        if (Object.keys(updates).length) await doc.ref.update(updates);
        userData = { ...userData, ...updates };

        if (EMAIL_VERIFICATION_REQUIRED && !userData.emailVerified) {
            return sendError(res, req, 403, "EMAIL_NOT_VERIFIED", "Please verify your email before logging in");
        }

        const token = issueSession(res, doc.id, userData.passwordVersion || 1);
        logAuditEvent(req, "auth_google_login_success", { email, userId: doc.id });

        return res.json({
            message: "Google auth successful",
            token,
            user: buildPublicUser(doc.id, { ...userData, name: userData.name || name, avatar: userData.avatar || picture }),
            requestId: req.id
        });
    } catch (err) {
        console.error("[Google OAuth] Firestore error:", err.message);
        logAuditEvent(req, "auth_google_login_error", { error: err.message });
        return sendError(res, req, 503, "DATABASE_ERROR", "Database error. Please try again.");
    }
});

// SIGNUP
router.post("/signup", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return sendError(res, req, 400, "VALIDATION_ERROR", "Email and password required");
        }
        if (!validateEmail(email)) {
            return sendError(res, req, 400, "VALIDATION_ERROR", "Please provide a valid email address");
        }
        if (!validatePassword(password)) {
            return sendError(
                res,
                req,
                400,
                "VALIDATION_ERROR",
                "Password must be 8-64 chars with uppercase, lowercase, number, and symbol"
            );
        }

        const existing = await db().collection("users").where("email", "==", email).limit(1).get();
        if (!existing.empty) {
            logAuditEvent(req, "auth_signup_denied_exists", { email });
            return sendError(res, req, 400, "USER_EXISTS", "User already exists");
        }

        const hashed = await bcrypt.hash(password, 10);
        const newRef = db().collection("users").doc();
        const userData = {
            email,
            password: hashed,
            name: "",
            avatar: "",
            googleId: null,
            emailVerified: !EMAIL_VERIFICATION_REQUIRED,
            passwordVersion: 1,
            createdAt: new Date().toISOString()
        };
        await newRef.set(userData);

        const token = issueSession(res, newRef.id, userData.passwordVersion);
        logAuditEvent(req, "auth_signup_success", { email, userId: newRef.id });
        return res.json({
            message: "Signup successful",
            token,
            user: buildPublicUser(newRef.id, userData),
            requestId: req.id
        });
    } catch (err) {
        console.error(err);
        logAuditEvent(req, "auth_signup_error", { error: err.message });
        return sendError(res, req, 500, "INTERNAL_SERVER_ERROR", "Server error");
    }
});

// LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return sendError(res, req, 400, "VALIDATION_ERROR", "Email and password required");
        }
        if (!validateEmail(email)) {
            return sendError(res, req, 400, "VALIDATION_ERROR", "Please provide a valid email address");
        }

        const snap = await db().collection("users").where("email", "==", email).limit(1).get();
        if (snap.empty) {
            logAuditEvent(req, "auth_login_denied_invalid_credentials", { email });
            return sendError(res, req, 400, "INVALID_CREDENTIALS", "Invalid credentials");
        }

        const doc = snap.docs[0];
        const userData = doc.data();
        if (!userData.password) {
            return sendError(res, req, 400, "GOOGLE_ACCOUNT_ONLY", "Please sign in with Google");
        }

        const valid = await bcrypt.compare(password, userData.password);
        if (!valid) {
            logAuditEvent(req, "auth_login_denied_invalid_credentials", { email, userId: doc.id });
            return sendError(res, req, 400, "INVALID_CREDENTIALS", "Invalid credentials");
        }

        if (EMAIL_VERIFICATION_REQUIRED && !userData.emailVerified) {
            return sendError(res, req, 403, "EMAIL_NOT_VERIFIED", "Please verify your email before logging in");
        }

        const token = issueSession(res, doc.id, userData.passwordVersion || 1);
        logAuditEvent(req, "auth_login_success", { email, userId: doc.id });
        return res.json({
            message: "Login successful",
            token,
            user: buildPublicUser(doc.id, userData),
            requestId: req.id
        });
    } catch (err) {
        console.error(err);
        logAuditEvent(req, "auth_login_error", { error: err.message });
        return sendError(res, req, 500, "INTERNAL_SERVER_ERROR", "Server error");
    }
});

// GOOGLE SIGNUP — Create new account OR login if exists (lookup by email)
router.post("/google/signup", async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) {
        return sendError(res, req, 400, "VALIDATION_ERROR", "idToken is required");
    }

    if (!isFirebaseConfigured()) {
        return sendError(res, req, 503, "GOOGLE_AUTH_DISABLED", "Google auth not configured on server");
    }

    let decoded;
    try {
        decoded = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
        console.error("[Google Signup] Token verification failed:", err.code, err.message);
        return sendError(res, req, 401, "INVALID_GOOGLE_TOKEN", "Invalid Google token", { providerCode: err.code });
    }

    const { uid, email, name = "", picture = "" } = decoded;
    if (!email) {
        return sendError(res, req, 400, "VALIDATION_ERROR", "No email in Google account");
    }

    try {
        // Lookup user by EMAIL (not by Firebase UID)
        const snap = await db().collection("users").where("email", "==", email).limit(1).get();
        
        // User already exists — just login and link Google
        if (!snap.empty) {
            const doc = snap.docs[0];
            let userData = doc.data();
            const updates = {};
            if (!userData.googleId) updates.googleId = uid;
            if (!userData.name && name) updates.name = name;
            if (!userData.avatar && picture) updates.avatar = picture;
            if (Object.keys(updates).length) await doc.ref.update(updates);
            userData = { ...userData, ...updates };

            const token = issueSession(res, doc.id, userData.passwordVersion || 1);
            logAuditEvent(req, "auth_google_signup_existing_login", { email, userId: doc.id });

            return res.json({
                message: "Google auth successful",
                token,
                user: buildPublicUser(doc.id, { ...userData, name: userData.name || name, avatar: userData.avatar || picture }),
                requestId: req.id
            });
        }
        
        // New user — CREATE account with automatic doc ID
        const newRef = db().collection("users").doc();
        const userData = {
            email,
            googleId: uid,
            name,
            avatar: picture,
            emailVerified: true,
            passwordVersion: 1,
            createdAt: new Date().toISOString()
        };
        await newRef.set(userData);
        
        const token = issueSession(res, newRef.id, userData.passwordVersion);
        logAuditEvent(req, "auth_google_signup_success", { email, userId: newRef.id });
        return res.json({
            message: "Google signup successful",
            token,
            user: buildPublicUser(newRef.id, userData),
            requestId: req.id
        });
    } catch (err) {
        console.error("[Google Signup] Firestore error:", err.message);
        logAuditEvent(req, "auth_google_signup_error", { error: err.message });
        return sendError(res, req, 503, "DATABASE_ERROR", "Database error. Please try again.");
    }
});

router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        if (!validateEmail(email)) {
            return sendError(res, req, 400, "VALIDATION_ERROR", "Please provide a valid email address");
        }

        const snap = await db().collection("users").where("email", "==", email).limit(1).get();
        if (snap.empty) {
            logAuditEvent(req, "auth_forgot_password_no_user", { email });
            return res.json({
                message: "If the email exists, a reset link has been generated.",
                requestId: req.id
            });
        }

        const doc = snap.docs[0];
        const resetToken = createOpaqueToken();
        const resetTokenHash = hashOpaqueToken(resetToken);
        const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        await doc.ref.update({ resetTokenHash, resetTokenExpiresAt });

        logAuditEvent(req, "auth_forgot_password_requested", { email, userId: doc.id });
        const response = {
            message: "If the email exists, a reset link has been generated.",
            requestId: req.id
        };

        if (process.env.NODE_ENV !== "production") {
            response.resetUrl = `${process.env.FRONTEND_BASE_URL || "http://localhost:3000"}/reset-password.html?token=${resetToken}`;
        }

        return res.json(response);
    } catch (error) {
        logAuditEvent(req, "auth_forgot_password_error", { error: error.message });
        return sendError(res, req, 500, "INTERNAL_SERVER_ERROR", "Server error");
    }
});

router.post("/reset-password", async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !validatePassword(password)) {
            return sendError(
                res,
                req,
                400,
                "VALIDATION_ERROR",
                "Valid token and strong password are required"
            );
        }

        const tokenHash = hashOpaqueToken(token);
        const snap = await db().collection("users").where("resetTokenHash", "==", tokenHash).limit(1).get();
        if (snap.empty) {
            return sendError(res, req, 400, "INVALID_RESET_TOKEN", "Invalid or expired reset token");
        }

        const doc = snap.docs[0];
        const userData = doc.data();
        if (!userData.resetTokenExpiresAt || new Date(userData.resetTokenExpiresAt).getTime() < Date.now()) {
            return sendError(res, req, 400, "INVALID_RESET_TOKEN", "Invalid or expired reset token");
        }

        const hashed = await bcrypt.hash(password, 10);
        const nextPasswordVersion = Number(userData.passwordVersion || 1) + 1;

        await doc.ref.update({
            password: hashed,
            passwordVersion: nextPasswordVersion,
            resetTokenHash: null,
            resetTokenExpiresAt: null
        });

        const sessionToken = issueSession(res, doc.id, nextPasswordVersion);
        logAuditEvent(req, "auth_password_reset_success", { userId: doc.id, email: userData.email });

        return res.json({
            message: "Password reset successful",
            token: sessionToken,
            requestId: req.id
        });
    } catch (error) {
        logAuditEvent(req, "auth_password_reset_error", { error: error.message });
        return sendError(res, req, 500, "INTERNAL_SERVER_ERROR", "Server error");
    }
});

router.post("/verify-email/request", authMiddleware, async (req, res) => {
    try {
        const userDoc = await db().collection("users").doc(req.user.id).get();
        if (!userDoc.exists) {
            return sendError(res, req, 404, "USER_NOT_FOUND", "User not found");
        }

        const userData = userDoc.data();
        if (userData.emailVerified) {
            return res.json({ message: "Email is already verified", requestId: req.id });
        }

        const verificationToken = createOpaqueToken();
        const verificationTokenHash = hashOpaqueToken(verificationToken);
        const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        await userDoc.ref.update({ verificationTokenHash, verificationTokenExpiresAt });

        logAuditEvent(req, "auth_email_verification_requested", { userId: req.user.id, email: userData.email });
        const response = { message: "Verification link generated", requestId: req.id };

        if (process.env.NODE_ENV !== "production") {
            response.verificationUrl = `${process.env.FRONTEND_BASE_URL || "http://localhost:3000"}/verify-email.html?token=${verificationToken}`;
        }

        return res.json(response);
    } catch (error) {
        logAuditEvent(req, "auth_email_verification_request_error", { error: error.message });
        return sendError(res, req, 500, "INTERNAL_SERVER_ERROR", "Server error");
    }
});

router.get("/verify-email/confirm", async (req, res) => {
    try {
        const token = req.query.token;
        if (!token) {
            return sendError(res, req, 400, "VALIDATION_ERROR", "Verification token is required");
        }

        const tokenHash = hashOpaqueToken(token);
        const snap = await db().collection("users").where("verificationTokenHash", "==", tokenHash).limit(1).get();
        if (snap.empty) {
            return sendError(res, req, 400, "INVALID_VERIFICATION_TOKEN", "Invalid or expired verification token");
        }

        const doc = snap.docs[0];
        const userData = doc.data();
        if (!userData.verificationTokenExpiresAt || new Date(userData.verificationTokenExpiresAt).getTime() < Date.now()) {
            return sendError(res, req, 400, "INVALID_VERIFICATION_TOKEN", "Invalid or expired verification token");
        }

        await doc.ref.update({
            emailVerified: true,
            verificationTokenHash: null,
            verificationTokenExpiresAt: null
        });

        logAuditEvent(req, "auth_email_verification_success", { userId: doc.id, email: userData.email });
        return res.json({ message: "Email verified successfully", requestId: req.id });
    } catch (error) {
        logAuditEvent(req, "auth_email_verification_error", { error: error.message });
        return sendError(res, req, 500, "INTERNAL_SERVER_ERROR", "Server error");
    }
});

router.post("/password/change", authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !validatePassword(newPassword)) {
            return sendError(
                res,
                req,
                400,
                "VALIDATION_ERROR",
                "Current password and a strong new password are required"
            );
        }

        const userRef = db().collection("users").doc(req.user.id);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return sendError(res, req, 404, "USER_NOT_FOUND", "User not found");
        }

        const userData = userDoc.data();
        if (!userData.password) {
            return sendError(res, req, 400, "GOOGLE_ACCOUNT_ONLY", "Password change is not available for Google-only accounts");
        }

        const valid = await bcrypt.compare(currentPassword, userData.password);
        if (!valid) {
            return sendError(res, req, 400, "INVALID_CREDENTIALS", "Current password is incorrect");
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        const nextPasswordVersion = Number(userData.passwordVersion || 1) + 1;
        await userRef.update({ password: hashed, passwordVersion: nextPasswordVersion });

        clearSessionCookie(res);
        logAuditEvent(req, "auth_password_change_success", { userId: req.user.id, email: userData.email });

        return res.json({
            message: "Password changed successfully. Please sign in again.",
            requestId: req.id
        });
    } catch (error) {
        logAuditEvent(req, "auth_password_change_error", { error: error.message });
        return sendError(res, req, 500, "INTERNAL_SERVER_ERROR", "Server error");
    }
});

router.post("/logout", authMiddleware, async (req, res) => {
    clearSessionCookie(res);
    logAuditEvent(req, "auth_logout", { userId: req.user.id });
    return res.json({ message: "Logged out", requestId: req.id });
});

// GET /me
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const doc = await db().collection("users").doc(req.user.id).get();
        if (!doc.exists) {
            return sendError(res, req, 404, "USER_NOT_FOUND", "User not found");
        }
        const u = doc.data();
        return res.json({ ...buildPublicUser(doc.id, u), requestId: req.id });
    } catch (err) {
        return sendError(res, req, 500, "INTERNAL_SERVER_ERROR", "Server error");
    }
});

module.exports = router;
