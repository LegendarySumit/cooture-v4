const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const TOKEN_TTL = process.env.SESSION_TOKEN_TTL || "7d";

function getCookieOptions() {
    const isProduction = process.env.NODE_ENV === "production";
    const secure = (process.env.SESSION_COOKIE_SECURE || "").toLowerCase() === "true" || isProduction;
    const sameSite = process.env.SESSION_COOKIE_SAMESITE || (isProduction ? "none" : "lax");

    return {
        httpOnly: true,
        secure,
        sameSite,
        path: "/",
        maxAge: Number(process.env.SESSION_COOKIE_MAX_AGE_MS || 7 * 24 * 60 * 60 * 1000)
    };
}

function getSessionCookieName() {
    return process.env.SESSION_COOKIE_NAME || "cooture_session";
}

function buildUserToken(userId, passwordVersion) {
    return jwt.sign(
        {
            id: userId,
            pv: Number(passwordVersion || 1)
        },
        process.env.JWT_SECRET,
        { expiresIn: TOKEN_TTL }
    );
}

function setSessionCookie(res, token) {
    res.cookie(getSessionCookieName(), token, getCookieOptions());
}

function clearSessionCookie(res) {
    res.clearCookie(getSessionCookieName(), {
        path: "/",
        sameSite: getCookieOptions().sameSite,
        secure: getCookieOptions().secure
    });
}

function createOpaqueToken() {
    return crypto.randomBytes(32).toString("hex");
}

function hashOpaqueToken(rawToken) {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
}

module.exports = {
    getSessionCookieName,
    buildUserToken,
    setSessionCookie,
    clearSessionCookie,
    createOpaqueToken,
    hashOpaqueToken
};
