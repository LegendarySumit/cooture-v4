const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const { requestContext, requestLogger } = require("./utils/requestContext");
const { errorResponse } = require("./utils/responses");
const { isFirebaseConfigured } = require("./utils/firebaseAdmin");
const { logAuditEvent } = require("./utils/auditLogger");
require("dotenv").config();

const PORT = process.env.PORT || 5000;
const STARTED_AT = Date.now();

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

const authLimiter = rateLimit({
    windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many authentication attempts. Please try again later."
        }
    }
});

const aiLimiter = rateLimit({
    windowMs: Number(process.env.AI_RATE_LIMIT_WINDOW_MS || 60 * 1000),
    max: Number(process.env.AI_RATE_LIMIT_MAX || 12),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many generation requests. Please slow down."
        }
    }
});

function createApp() {
    const app = express();

    app.use(requestContext);
    app.use(requestLogger);
    app.set("trust proxy", 1);
    app.use(
        helmet({
            crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
        })
    );
    app.use(
        cors({
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);
                if (allowedOrigins.includes(origin)) return callback(null, true);
                return callback(new Error("CORS origin not allowed"));
            },
            credentials: true
        })
    );
    app.use(cookieParser());
    app.use(express.json({ limit: "200kb" }));

    // Health check — used by frontend to pre-warm Render on page load
    app.get("/health", (req, res) => res.json({ status: "ok", requestId: req.id }));

    app.get("/ready", (req, res) => {
        const dependencyStatus = {
            jwtSecretConfigured: Boolean(process.env.JWT_SECRET),
            geminiConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.AI_API_KEY),
            firebaseConfigured: isFirebaseConfigured()
        };

        const ready = Object.values(dependencyStatus).every(Boolean);
        const payload = {
            status: ready ? "ready" : "degraded",
            requestId: req.id,
            uptimeSeconds: Math.floor((Date.now() - STARTED_AT) / 1000),
            dependencies: dependencyStatus
        };

        return res.status(ready ? 200 : 503).json(payload);
    });

    app.use("/auth/signup", authLimiter);
    app.use("/auth/login", authLimiter);
    app.use("/auth/google", authLimiter);
    app.use("/auth/forgot-password", authLimiter);
    app.use("/auth/reset-password", authLimiter);
    app.use("/auth/verify-email", authLimiter);
    app.use("/ai/generate", aiLimiter);

    app.use("/admin", (req, res, next) => {
        logAuditEvent(req, "admin_action_attempt", {
            path: req.originalUrl,
            method: req.method
        });
        next();
    });

    // Routes
    app.use("/auth", require("./routes/auth"));
    app.use("/ai", require("./routes/ai"));

    app.use((err, req, res, next) => {
        if (err && err.message === "CORS origin not allowed") {
            return res.status(403).json(errorResponse(req, "CORS_ORIGIN_DENIED", "Origin not allowed"));
        }

        if (res.headersSent) {
            return next(err);
        }

        return res.status(500).json(errorResponse(req, "INTERNAL_SERVER_ERROR", "Unexpected server error"));
    });

    return app;
}

if (require.main === module) {
    const app = createApp();
    app.listen(PORT, () =>
        console.log(`Server running on port ${PORT}`)
    );
}

module.exports = { createApp };
