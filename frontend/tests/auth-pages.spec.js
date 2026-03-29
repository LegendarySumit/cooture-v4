const { test, expect } = require("@playwright/test");

test("login page renders required controls", async ({ page }) => {
    await page.goto("/login.html");

    await expect(page.locator("#loginEmail")).toBeVisible();
    await expect(page.locator("#loginPassword")).toBeVisible();
    await expect(page.locator("#loginSubmit")).toBeVisible();
    await expect(page.locator("#googleLoginBtn")).toBeVisible();
});

test("signup page renders required controls", async ({ page }) => {
    await page.goto("/signup.html");

    await expect(page.locator("#signupEmail")).toBeVisible();
    await expect(page.locator("#signupPassword")).toBeVisible();
    await expect(page.locator("#signupSubmit")).toBeVisible();
    await expect(page.locator("#googleSignupBtn")).toBeVisible();
});
