function errorResponse(req, code, message, details) {
    const payload = {
        error: {
            code,
            message
        },
        requestId: req.id
    };

    if (details !== undefined) {
        payload.error.details = details;
    }

    return payload;
}

function sendError(res, req, status, code, message, details) {
    return res.status(status).json(errorResponse(req, code, message, details));
}

module.exports = {
    errorResponse,
    sendError
};
