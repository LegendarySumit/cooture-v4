const admin = require("firebase-admin");
const path = require("path");

let initialized = false;

function initializeFirebaseAdmin() {
    if (initialized || admin.apps.length) {
        initialized = true;
        return true;
    }

    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (serviceAccountPath) {
        const resolvedPath = path.isAbsolute(serviceAccountPath)
            ? serviceAccountPath
            : path.join(__dirname, "..", serviceAccountPath.replace(/^\.\//, ""));
        try {
            const serviceAccount = require(resolvedPath);
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
            initialized = true;
            console.log("[firebase] Admin initialized from service account file.");
            return true;
        } catch (error) {
            console.error("[firebase] Failed to load service account file:", error.message);
            return false;
        }
    }

    const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (rawServiceAccount) {
        try {
            admin.initializeApp({ credential: admin.credential.cert(JSON.parse(rawServiceAccount)) });
            initialized = true;
            console.log("[firebase] Admin initialized from env var.");
            return true;
        } catch (error) {
            console.error("[firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT:", error.message);
            return false;
        }
    }

    console.warn("[firebase] Admin not configured. Google OAuth and lifecycle email links will be disabled.");
    return false;
}

function isFirebaseConfigured() {
    return initializeFirebaseAdmin() && admin.apps.length > 0;
}

function getDb() {
    if (!isFirebaseConfigured()) {
        return null;
    }
    return admin.firestore();
}

module.exports = {
    admin,
    initializeFirebaseAdmin,
    isFirebaseConfigured,
    getDb
};
