const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
    const authHeader = req.headers.authorization;
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        return res.status(500).json({ message: "Server auth configuration missing" });
    }

    if (!authHeader) {
        return res.status(401).json({ message: "No token provided" });
    }

    if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Invalid authorization header" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, jwtSecret);
        if (!decoded?.id) {
            return res.status(401).json({ message: "Invalid token payload" });
        }
        req.user = { id: decoded.id };
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
};
