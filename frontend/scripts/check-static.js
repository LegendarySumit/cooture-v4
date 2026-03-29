const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const filesToCheck = ["index.html", "login.html", "signup.html", "js/custom.js", "js/firebase-init.js"];

const missing = filesToCheck.filter((rel) => !fs.existsSync(path.join(root, rel)));
if (missing.length) {
    console.error("Missing required frontend files:", missing.join(", "));
    process.exit(1);
}

const loginHtml = fs.readFileSync(path.join(root, "login.html"), "utf8");
const signupHtml = fs.readFileSync(path.join(root, "signup.html"), "utf8");

const requiredLoginIds = ["loginEmail", "loginPassword", "loginSubmit", "googleLoginBtn"];
const requiredSignupIds = ["signupEmail", "signupPassword", "signupSubmit", "googleSignupBtn"];

for (const id of requiredLoginIds) {
    if (!loginHtml.includes(`id=\"${id}\"`)) {
        console.error(`login.html is missing required element id: ${id}`);
        process.exit(1);
    }
}

for (const id of requiredSignupIds) {
    if (!signupHtml.includes(`id=\"${id}\"`)) {
        console.error(`signup.html is missing required element id: ${id}`);
        process.exit(1);
    }
}

console.log("Frontend static checks passed.");
