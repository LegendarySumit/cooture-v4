const jwt = require("jsonwebtoken");
const { errorResponse } = require("../utils/responses");

module.exports = function (req, res, next) {
    const authHeader = req.headers.authorization;
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        return res.status(500).json(errorResponse(req, "AUTH_CONFIG_MISSING", "Server auth configuration missing"));
    }

    if (!authHeader) {
        return res.status(401).json(errorResponse(req, "AUTH_TOKEN_MISSING", "No token provided"));
    }

    if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json(errorResponse(req, "AUTH_HEADER_INVALID", "Invalid authorization header"));
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, jwtSecret);
        if (!decoded?.id) {
            return res.status(401).json(errorResponse(req, "AUTH_TOKEN_INVALID", "Invalid token payload"));
        }
        req.user = { id: decoded.id };
        next();
    } catch (err) {
        return res.status(401).json(errorResponse(req, "AUTH_TOKEN_INVALID", "Invalid token"));
    }
};
