const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
require("dotenv").config();

const router = express.Router();

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

// SIGNUP
router.post("/signup", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Email and password required" });

        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ message: "User already exists" });

        const hashed = await bcrypt.hash(password, 10);
        const newUser = await User.create({ email, password: hashed });

        const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: "7d" });

        return res.json({
            message: "Signup successful",
            token,
            user: {
                id: newUser._id,
                email: newUser.email,
                createdAt: newUser.createdAt
            }
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

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

        return res.json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                email: user.email
            }
        });
        
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
});

// const authMiddleware = require("../middleware/authMiddleware");

router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("email _id createdAt");

        if (!user) return res.status(404).json({ message: "User not found" });

        return res.json({
            id: user._id,
            email: user.email,
            createdAt: user.createdAt
        });

    } catch (err) {
        return res.status(500).json({ message: "Server error", error: err.message });
    }
});



module.exports = router;
