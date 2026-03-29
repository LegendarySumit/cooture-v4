function logAuditEvent(req, event, details = {}) {
    const payload = {
        type: "audit",
        event,
        timestamp: new Date().toISOString(),
        requestId: req?.id || null,
        userId: req?.user?.id || null,
        ip: req?.ip || null,
        path: req?.originalUrl || null,
        method: req?.method || null,
        details
    };

    console.log(JSON.stringify(payload));
}

module.exports = {
    logAuditEvent
};
