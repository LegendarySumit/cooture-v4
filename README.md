<div align="center">

# 🎨 Cooture v4

**AI-powered website template generator with secure authentication and production-ready deployment workflows**

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)
![Gemini](https://img.shields.io/badge/Gemini-4285F4?logo=google&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?logo=render&logoColor=black)

*AI template generation • Google sign-in and email auth • Production hardening (P0/P1/P2) • CI with smoke tests*

[Live Demo](https://cooture-v4.vercel.app) • [Features](#-features) • [Quick Start](#-quick-start) • [Tech Stack](#-tech-stack)

</div>

---

## 📖 About

Cooture v4 is a full-stack web application designed to generate clean, responsive website templates from natural-language prompts. The project combines a static frontend experience with a Node.js backend that securely proxies AI generation requests to Gemini.

It includes a hardened authentication flow with email/password and Google sign-in, plus production-focused controls such as CORS allowlisting, structured logging, rate limits, readiness checks, audit logs, and CI validation. The goal is to keep UX smooth while maintaining deployment-grade safety and maintainability.

---

## ✨ Features

- ✅ AI-powered website template generation via Gemini backend proxy
- ✅ Dual authentication: email/password and Google sign-in
- ✅ Dual-mode session support: HttpOnly cookie session + bearer compatibility
- ✅ Forgot/reset password lifecycle and optional email verification flow
- ✅ Password-change session revocation with versioned token checks
- ✅ Readiness + health endpoints for deployment orchestration
- ✅ Audit logging for auth and privileged action attempts
- ✅ Route-specific rate limits and payload validation
- ✅ CI pipelines for backend tests and frontend smoke checks

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| HTML5 + SCSS/CSS | UI layout and styling |
| Vanilla JavaScript | Auth, API integration, and interactive behavior |
| Bootstrap | Responsive components and utility classes |
| Playwright | Auth-page smoke testing |

### Backend

| Technology | Purpose |
|---|---|
| Node.js + Express | API server and routing |
| Firebase Admin + Firestore | User data and identity integration |
| JWT + HttpOnly Cookies | Session/auth model with dual compatibility |
| Gemini API | Template generation engine |
| Helmet + CORS + Rate Limit | Security hardening and abuse resistance |
| Jest + Supertest | Backend test coverage |

### DevOps

| Service | Role |
|---|---|
| GitHub Actions | CI checks (security, tests, smoke) |
| Vercel | Frontend hosting |
| Render | Backend hosting |

---

## 📁 Project Structure

```text
cooture-v4/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── secret-hygiene.yml
├── backend/
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── routes/
│   │   ├── ai.js
│   │   └── auth.js
│   ├── tests/
│   │   └── api.test.js
│   ├── utils/
│   │   ├── auditLogger.js
│   │   ├── authSession.js
│   │   ├── firebaseAdmin.js
│   │   ├── requestContext.js
│   │   ├── responses.js
│   │   └── validation.js
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   ├── render.yaml
│   └── server.js
├── frontend/
│   ├── js/
│   │   ├── custom.js
│   │   └── firebase-init.js
│   ├── scss/
│   ├── scripts/
│   │   └── check-static.js
│   ├── tests/
│   │   └── auth-pages.spec.js
│   ├── login.html
│   ├── signup.html
│   ├── forgot-password.html
│   ├── reset-password.html
│   ├── package.json
│   ├── package-lock.json
│   └── playwright.config.js
├── scripts/
│   └── security/
│       └── scan-git-secrets.ps1
├── LICENSE
└── README.md
```

---

## 🚀 Quick Start

### 1. Clone and install

```bash
git clone https://github.com/LegendarySumit/cooture-v4.git
cd cooture-v4

cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure backend env

```bash
cd ../backend
cp .env.example .env
```

Fill `.env` with your actual secrets and deployment origins.

### 3. Run backend

```bash
cd backend
npm start
```

### 4. Run frontend

```bash
cd frontend
npx http-server -p 3000 -a 127.0.0.1
```

---

## ⚙️ Configuration

### Required backend variables

| Variable | Required | Example |
|---|---|---|
| `JWT_SECRET` | Yes | long random secret |
| `GEMINI_API_KEY` | Yes | Gemini API key |
| `FRONTEND_ORIGINS` | Yes | `https://cooture-v4.vercel.app,http://localhost:3000` |
| `FIREBASE_SERVICE_ACCOUNT` or `FIREBASE_SERVICE_ACCOUNT_PATH` | Yes | one-line JSON or local path |
| `GEMINI_MODEL` | Yes | `gemini-2.5-flash` |
| `GEMINI_API_URL` | Yes | `https://generativelanguage.googleapis.com/v1beta` |

### Optional P2 session/lifecycle variables

| Variable | Suggested Production Value |
|---|---|
| `EMAIL_VERIFICATION_REQUIRED` | `false` (switch to `true` when ready) |
| `FRONTEND_BASE_URL` | `https://cooture-v4.vercel.app` |
| `SESSION_COOKIE_NAME` | `cooture_session` |
| `SESSION_COOKIE_SECURE` | `true` |
| `SESSION_COOKIE_SAMESITE` | `none` |
| `SESSION_COOKIE_MAX_AGE_MS` | `604800000` |
| `SESSION_TOKEN_TTL` | `7d` |

---

## 📚 Usage

1. Sign up with email/password or continue with Google.
2. Log in to access protected generation features.
3. Enter a prompt describing the desired page layout.
4. Generate and review AI output from the secured backend route.
5. Use account lifecycle pages for password reset and session management.

---

## 🔌 API Endpoints

### Auth

```http
POST /auth/signup
POST /auth/login
POST /auth/google
POST /auth/google/signup
GET  /auth/me
POST /auth/logout
POST /auth/forgot-password
POST /auth/reset-password
POST /auth/password/change
POST /auth/verify-email/request
GET  /auth/verify-email/confirm?token=...
```

### AI

```http
POST /ai/generate
```

### Ops

```http
GET /health
GET /ready
```

---

## 📊 Project Statistics

| Category | Status |
|---|---|
| P0 (security baseline) | ✅ Complete |
| P1 (stability + abuse resistance) | ✅ Complete |
| P2 (security maturity + lifecycle) | ✅ Complete |
| Backend tests | ✅ Passing |
| Frontend smoke tests | ✅ Passing |
| Production readiness | **96%** |

---

## 🐛 Troubleshooting

### CORS blocked from Vercel

- Ensure `FRONTEND_ORIGINS` contains exact origin(s) with protocol and no trailing slash.
- Example: `https://cooture-v4.vercel.app,https://www.cooture-v4.vercel.app,http://localhost:3000`

### Google sign-in popup closes/fails

- Ensure backend sends `Cross-Origin-Opener-Policy: same-origin-allow-popups`.
- Confirm Firebase Admin credentials are valid in Render.

### Cookies not persisted cross-site

- Use `SESSION_COOKIE_SECURE=true` and `SESSION_COOKIE_SAMESITE=none` in production.

---

## 🔮 Future Enhancements

- [ ] Add transactional email delivery for reset and verification links
- [ ] Add user-level generation history and saved templates
- [ ] Add role-based admin dashboard with explicit authorization policies
- [ ] Add per-user token/session management UI
- [ ] Expand API contract tests for full account lifecycle edge cases

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

---

## 👨‍💻 Author

**LegendarySumit**

- GitHub: [@LegendarySumit](https://github.com/LegendarySumit)
- Project: [Cooture v4](https://github.com/LegendarySumit/cooture-v4)
- Live Demo: [cooture-v4.vercel.app](https://cooture-v4.vercel.app)

---

<div align="center">

**🚀 Build Faster, Ship Smarter**

*Cooture v4 • Production-ready AI website generation workflow*

---

**⭐ Star this repo if you find it helpful!**

</div>
