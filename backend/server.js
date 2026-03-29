const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
    console.error("[startup] JWT_SECRET is missing. Refusing to start.");
    process.exit(1);
}

const configuredOrigins = (process.env.FRONTEND_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = configuredOrigins.length
    ? configuredOrigins
    : [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ];

app.use(helmet());
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new Error("CORS origin not allowed"));
        }
    })
);
app.use(express.json({ limit: "200kb" }));

// Health check — used by frontend to pre-warm Render on page load
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/ai", require("./routes/ai"));

app.use((err, req, res, next) => {
    if (err && err.message === "CORS origin not allowed") {
        return res.status(403).json({ message: "Origin not allowed" });
    }
    return next(err);
});

app.listen(PORT, () =>
    console.log(`Server running on port ${PORT}`)
);
