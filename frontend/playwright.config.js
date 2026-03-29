const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
    testDir: "./tests",
    timeout: 30000,
    webServer: {
        command: "npx http-server . -p 3000 -a 127.0.0.1",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: true,
        timeout: 120000
    },
    use: {
        baseURL: "http://127.0.0.1:3000",
        headless: true
    }
});
