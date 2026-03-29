const express = require("express");
const axios = require("axios");
const authMiddleware = require("../middleware/authMiddleware");
const { sendError } = require("../utils/responses");
const { validatePrompt } = require("../utils/validation");

const router = express.Router();

const sanitizeHtml = (text = "") =>
    text.replace(/```html?/gi, "").replace(/```/g, "").trim();

const buildModelFallbackChain = (requestedModel = "") => {
    const trimmed = requestedModel.trim() || "gemini-1.5-flash";
    const candidates = [trimmed];

    if (/-latest$/i.test(trimmed)) {
        const baseName = trimmed.replace(/-latest$/i, "");
        candidates.push(`${baseName}-001`, baseName);
    }

    if (!candidates.includes("gemini-1.5-flash")) {
        candidates.push("gemini-1.5-flash");
    }

    return [...new Set(candidates.filter(Boolean))];
};

router.post("/generate", authMiddleware, async (req, res) => {
    const { prompt } = req.body;

    if (!validatePrompt(prompt)) {
        return sendError(
            res,
            req,
            400,
            "VALIDATION_ERROR",
            "Prompt must be between 10 and 4000 characters"
        );
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;

    if (!apiKey) {
        return sendError(res, req, 500, "MISSING_GEMINI_KEY", "Gemini API key is not configured.");
    }

    const modelPreference = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const modelsToTry = buildModelFallbackChain(modelPreference);
    const baseUrl = process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta";

    const systemPrompt = `You are an expert UI generator. Output ONLY valid HTML and CSS inside <html>...</html>. No markdown. No backticks. No explanations. Generate a fully responsive template for: ${prompt.trim()}`;

    try {
        for (const candidate of modelsToTry) {
            const url = `${baseUrl}/models/${candidate}:generateContent?key=${apiKey}`;

            try {
                const response = await axios.post(
                    url,
                    {
                        contents: [
                            {
                                parts: [{ text: systemPrompt }]
                            }
                        ]
                    },
                    {
                        headers: { "Content-Type": "application/json" }
                    }
                );

                const data = response.data;
                const html = sanitizeHtml(
                    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
                    "No output generated."
                );

                return res.json({ html, modelUsed: candidate, requestId: req.id });
            } catch (error) {
                const status = error.response?.status || 500;
                const message =
                    error.response?.data?.error?.message ||
                    error.message ||
                    "Unable to generate template.";

                const missingModel =
                    status === 404 || /not found/i.test(message) || /not supported/i.test(message);

                if (!missingModel || candidate === modelsToTry[modelsToTry.length - 1]) {
                    return sendError(res, req, status, "GENERATION_ERROR", message);
                }
                // Try the next candidate when the selected model isn't available for this API version.
            }
        }
    } catch (error) {
        const status = error.response?.status || 500;
        const message =
            error.response?.data?.error?.message ||
            error.message ||
            "Unable to generate template.";

        return sendError(res, req, status, "GENERATION_ERROR", message);
    }
});

module.exports = router;
