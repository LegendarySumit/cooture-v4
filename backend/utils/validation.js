const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email) {
    return typeof email === "string" && EMAIL_REGEX.test(email.trim());
}

function validatePassword(password) {
    if (typeof password !== "string") return false;
    if (password.length < 8 || password.length > 64) return false;

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);

    return hasLower && hasUpper && hasDigit && hasSymbol;
}

function validatePrompt(prompt) {
    return typeof prompt === "string" && prompt.trim().length >= 10 && prompt.trim().length <= 4000;
}

module.exports = {
    validateEmail,
    validatePassword,
    validatePrompt
};
