const { randomUUID } = require("crypto");

function requestContext(req, res, next) {
    req.id = req.headers["x-request-id"] || randomUUID();
    res.setHeader("x-request-id", req.id);
    next();
}

function requestLogger(req, res, next) {
    const startedAt = process.hrtime.bigint();

    res.on("finish", () => {
        const endedAt = process.hrtime.bigint();
        const durationMs = Number(endedAt - startedAt) / 1_000_000;

        const logEntry = {
            level: res.statusCode >= 500 ? "error" : "info",
            requestId: req.id,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            latencyMs: Number(durationMs.toFixed(2)),
            userAgent: req.get("user-agent") || "",
            ip: req.ip
        };

        console.log(JSON.stringify(logEntry));
    });

    next();
}

module.exports = {
    requestContext,
    requestLogger
};
