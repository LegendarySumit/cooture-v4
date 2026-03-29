const jwt = require("jsonwebtoken");
const { errorResponse } = require("../utils/responses");
const { getSessionCookieName } = require("../utils/authSession");
const { getDb } = require("../utils/firebaseAdmin");

module.exports = async function (req, res, next) {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.[getSessionCookieName()];
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        return res.status(500).json(errorResponse(req, "AUTH_CONFIG_MISSING", "Server auth configuration missing"));
    }

    let token = cookieToken;

    if (authHeader) {
        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json(errorResponse(req, "AUTH_HEADER_INVALID", "Invalid authorization header"));
        }
        token = authHeader.split(" ")[1];
    }

    if (!token) {
        return res.status(401).json(errorResponse(req, "AUTH_TOKEN_MISSING", "No token provided"));
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);
        if (!decoded?.id) {
            return res.status(401).json(errorResponse(req, "AUTH_TOKEN_INVALID", "Invalid token payload"));
        }

        const db = getDb();
        if (db) {
            const userDoc = await db.collection("users").doc(decoded.id).get();
            if (!userDoc.exists) {
                return res.status(401).json(errorResponse(req, "AUTH_TOKEN_INVALID", "Session user no longer exists"));
            }

            const userData = userDoc.data();
            const serverPasswordVersion = Number(userData.passwordVersion || 1);
            const tokenPasswordVersion = Number(decoded.pv || 1);

            if (tokenPasswordVersion !== serverPasswordVersion) {
                return res.status(401).json(errorResponse(req, "SESSION_REVOKED", "Session has been revoked. Please sign in again."));
            }
        }

        req.user = { id: decoded.id, pv: Number(decoded.pv || 1) };
        next();
    } catch (err) {
        return res.status(401).json(errorResponse(req, "AUTH_TOKEN_INVALID", "Invalid token"));
    }
};
