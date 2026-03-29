process.env.JWT_SECRET = "test_jwt_secret";
process.env.SESSION_COOKIE_SAMESITE = "lax";

const request = require("supertest");
const { createApp } = require("../server");

jest.mock("firebase-admin", () => {
    const users = new Map();
    const apps = [];

    const makeDoc = (id, data) => ({
        id,
        exists: Boolean(data),
        data: () => data,
        ref: {
            update: async (updates) => {
                const current = users.get(id) || {};
                users.set(id, { ...current, ...updates });
            }
        }
    });

    const firestore = () => ({
        collection: (name) => {
            if (name !== "users") {
                throw new Error("Only users collection is supported in tests");
            }

            return {
                where: (field, op, value) => ({
                    limit: () => ({
                        get: async () => {
                            const hits = [];
                            for (const [id, user] of users.entries()) {
                                if (field === "email" && op === "==" && user.email === value) {
                                    hits.push(makeDoc(id, user));
                                }
                            }
                            return { empty: hits.length === 0, docs: hits.slice(0, 1) };
                        }
                    })
                }),
                doc: (id) => {
                    if (!id) {
                        const generatedId = `user_${users.size + 1}`;
                        return {
                            id: generatedId,
                            set: async (payload) => {
                                users.set(generatedId, payload);
                            }
                        };
                    }

                    const data = users.get(id);
                    return {
                        id,
                        get: async () => makeDoc(id, data),
                        set: async (payload) => {
                            users.set(id, payload);
                        }
                    };
                }
            };
        }
    });

    return {
        apps,
        initializeApp: jest.fn(() => {
            if (!apps.length) apps.push({ name: "test-app" });
        }),
        credential: {
            cert: jest.fn(() => ({}))
        },
        firestore,
        auth: () => ({
            verifyIdToken: jest.fn(async () => {
                throw Object.assign(new Error("not configured"), { code: "auth/invalid-token" });
            })
        })
    };
});

describe("API smoke", () => {
    let app;

    beforeAll(() => {
        app = createApp();
    });

    test("GET /health returns ok", async () => {
        const res = await request(app).get("/health");
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe("ok");
        expect(typeof res.body.requestId).toBe("string");
    });

    test("POST /auth/signup happy path", async () => {
        const res = await request(app)
            .post("/auth/signup")
            .send({
                email: "user@example.com",
                password: "StrongPass1!"
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.token).toBeTruthy();
        expect(res.body.user.email).toBe("user@example.com");
        expect(res.body.user.emailVerified).toBe(true);
    });

    test("POST /auth/login happy path", async () => {
        const res = await request(app)
            .post("/auth/login")
            .send({
                email: "user@example.com",
                password: "StrongPass1!"
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.token).toBeTruthy();
    });

    test("POST /auth/signup rejects weak password", async () => {
        const res = await request(app)
            .post("/auth/signup")
            .send({
                email: "weak@example.com",
                password: "1234"
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("POST /auth/forgot-password returns generic success", async () => {
        const res = await request(app)
            .post("/auth/forgot-password")
            .send({ email: "user@example.com" });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toMatch(/reset link/i);
    });

    test("POST /ai/generate rejects without token", async () => {
        const res = await request(app)
            .post("/ai/generate")
            .send({ prompt: "Build a modern landing page for a SaaS startup" });

        expect(res.statusCode).toBe(401);
        expect(res.body.error.code).toBe("AUTH_TOKEN_MISSING");
    });
});
