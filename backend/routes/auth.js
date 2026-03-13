const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const admin = require("firebase-admin");
const path = require("path");
require("dotenv").config();

// ── Firebase Admin init (once) ───────────────────────────────
if (!admin.apps.length) {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (serviceAccountPath) {
        const resolvedPath = path.isAbsolute(serviceAccountPath)
            ? serviceAccountPath
            : path.join(__dirname, "..", serviceAccountPath.replace(/^\.\//, ""));
        try {
            const serviceAccount = require(resolvedPath);
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
            console.log("[auth] Firebase Admin initialized from service account file.");
        } catch (e) {
            console.error("[auth] Failed to load service account:", e.message);
        }
    } else {
        const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (sa) {
            admin.initializeApp({ credential: admin.credential.cert(JSON.parse(sa)) });
            console.log("[auth] Firebase Admin initialized from env var.");
        } else {
            console.warn("[auth] Firebase Admin not configured — Google OAuth will be disabled.");
        }
    }
}

const router = express.Router();
const db = () => admin.firestore();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// helper: verify token middleware (used by /me)
function authMiddleware(req, res, next) {
    try {
        const header = req.headers.authorization || "";
        const token = header.split(" ")[1];
        if (!token) return res.status(401).json({ message: "No token provided" });
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = { id: decoded.id };
        return next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
}

// GOOGLE LOGIN — Only for registered users (lookup by email)
router.post("/google", async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: "ID token required" });

    if (!admin.apps.length) {
        return res.status(503).json({ message: "Google auth not configured on server" });
    }

    let decoded;
    try {
        decoded = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
        console.error("[Google OAuth] Token verification failed:", err.code, err.message);
        return res.status(401).json({ message: "Invalid Google token", error: err.message, code: err.code });
    }

    const { uid, email, name = "", picture = "" } = decoded;
    if (!email) return res.status(400).json({ message: "No email in Google account" });

    try {
        // Lookup user by EMAIL (not by Firebase UID)
        const snap = await db().collection("users").where("email", "==", email).limit(1).get();
        
        // ❌ User must be registered first — no auto-signup
        if (snap.empty) {
            return res.status(400).json({ message: "User not registered. Please sign up first." });
        }
        
        const doc = snap.docs[0];
        let userData = doc.data();
        const updates = {};
        if (!userData.googleId) updates.googleId = uid;
        if (!userData.name && name) updates.name = name;
        if (!userData.avatar && picture) updates.avatar = picture;
        if (Object.keys(updates).length) await doc.ref.update(updates);
        userData = { ...userData, ...updates };

        const token = jwt.sign({ id: doc.id }, JWT_SECRET, { expiresIn: "7d" });
        return res.json({
            message: "Google auth successful",
            token,
            user: { id: doc.id, email: userData.email, name: userData.name || name, avatar: userData.avatar || picture }
        });
    } catch (err) {
        console.error("[Google OAuth] Firestore error:", err.message);
        return res.status(503).json({ message: "Database error. Please try again.", error: err.message });
    }
});

// SIGNUP
router.post("/signup", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Email and password required" });

        const existing = await db().collection("users").where("email", "==", email).limit(1).get();
        if (!existing.empty) return res.status(400).json({ message: "User already exists" });

        const hashed = await bcrypt.hash(password, 10);
        const newRef = db().collection("users").doc();
        const userData = { email, password: hashed, name: "", avatar: "", googleId: null, createdAt: new Date().toISOString() };
        await newRef.set(userData);

        const token = jwt.sign({ id: newRef.id }, JWT_SECRET, { expiresIn: "7d" });
        return res.json({
            message: "Signup successful",
            token,
            user: { id: newRef.id, email, createdAt: userData.createdAt }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
});

// LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Email and password required" });

        const snap = await db().collection("users").where("email", "==", email).limit(1).get();
        if (snap.empty) return res.status(400).json({ message: "Invalid credentials" });

        const doc = snap.docs[0];
        const userData = doc.data();
        if (!userData.password) return res.status(400).json({ message: "Please sign in with Google" });

        const valid = await bcrypt.compare(password, userData.password);
        if (!valid) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: doc.id }, JWT_SECRET, { expiresIn: "7d" });
        return res.json({
            message: "Login successful",
            token,
            user: { id: doc.id, email: userData.email }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
});

// GOOGLE SIGNUP — Create new account OR login if exists (lookup by email)
router.post("/google/signup", async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: "ID token required" });

    if (!admin.apps.length) {
        return res.status(503).json({ message: "Google auth not configured on server" });
    }

    let decoded;
    try {
        decoded = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
        console.error("[Google Signup] Token verification failed:", err.code, err.message);
        return res.status(401).json({ message: "Invalid Google token", error: err.message, code: err.code });
    }

    const { uid, email, name = "", picture = "" } = decoded;
    if (!email) return res.status(400).json({ message: "No email in Google account" });

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

            const token = jwt.sign({ id: doc.id }, JWT_SECRET, { expiresIn: "7d" });
            return res.json({
                message: "Google auth successful",
                token,
                user: { id: doc.id, email: userData.email, name: userData.name || name, avatar: userData.avatar || picture }
            });
        }
        
        // New user — CREATE account with automatic doc ID
        const newRef = db().collection("users").doc();
        const userData = { email, googleId: uid, name, avatar: picture, createdAt: new Date().toISOString() };
        await newRef.set(userData);
        
        const token = jwt.sign({ id: newRef.id }, JWT_SECRET, { expiresIn: "7d" });
        return res.json({
            message: "Google signup successful",
            token,
            user: { id: newRef.id, email, name, avatar: picture }
        });
    } catch (err) {
        console.error("[Google Signup] Firestore error:", err.message);
        return res.status(503).json({ message: "Database error. Please try again.", error: err.message });
    }
});

// GET /me
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const doc = await db().collection("users").doc(req.user.id).get();
        if (!doc.exists) return res.status(404).json({ message: "User not found" });
        const u = doc.data();
        return res.json({ id: doc.id, email: u.email, name: u.name, avatar: u.avatar, createdAt: u.createdAt });
    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
    }
});

module.exports = router;
