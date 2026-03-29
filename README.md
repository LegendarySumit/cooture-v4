# Cooture v4

Cooture v4 is a full-stack web application that lets users generate ready-to-use website templates powered by AI. It combines a clean fashion-inspired interface with modern authentication so users can explore templates, save their profile, and build faster.

## Security Notes (P0)

- Never commit secrets. Keep `backend/.env` and Firebase service-account credentials out of git.
- Backend startup now fails if `JWT_SECRET` is missing.
- CORS is allowlist-based via `FRONTEND_ORIGINS`.
- Automated secret scanning runs in GitHub Actions (`.github/workflows/secret-hygiene.yml`).

## 📁 Project Structure

```
Cooture v4/
├── backend/              # Node.js + Express backend
│   ├── .env             # Environment variables (JWT_SECRET, GEMINI_*, FIREBASE_*, PORT)
│   ├── package.json     # Backend dependencies
│   ├── server.js        # Express server entry point
│   ├── middleware/      # Authentication middleware
│   ├── models/          # Data models (if used)
│   └── routes/          # API routes (auth, etc.)
│
├── frontend/            # Static frontend files
│   ├── index.html       # Homepage
│   ├── login.html       # Login page
│   ├── signup.html      # Signup page
│   ├── profile.html     # User profile page
│   ├── package.json     # Frontend dependencies (if any)
│   ├── css/             # Compiled CSS files
│   ├── js/              # Frontend JavaScript
│   └── scss/            # SCSS source files
│
└── README.md            # This file
```

## 🚀 Getting Started

### Backend Setup

1. Navigate to backend folder:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file with:
```
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secret_key
FRONTEND_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
GEMINI_API_KEY=your_gemini_or_other_supported_ai_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

You can also copy `backend/.env.example` and edit values.

Optional local secret scan before commit:
```bash
powershell -ExecutionPolicy Bypass -File scripts/security/scan-git-secrets.ps1
```

4. Start the server:
```bash
npm start
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend folder:
```bash
cd frontend
```

2. Open `index.html` in a browser or use a local server:
```bash
# Using Python
python -m http.server 3000

# Or using Node.js http-server
npx http-server -p 3000
```

Frontend will be accessible at `http://localhost:3000`

## 📝 API Endpoints

- `POST /auth/signup` - Email signup
- `POST /auth/login` - Email login
- `POST /auth/google` - Google login (existing users)
- `POST /auth/google/signup` - Google signup/login
- `GET /auth/me` - Get user profile (requires Bearer JWT)
- `POST /ai/generate` - Protected endpoint that proxies requests to Gemini
- `GET /health` - Backend liveness endpoint

## 🛠️ Technologies

**Backend:**
- Node.js
- Express.js
- Firebase Admin + Firestore
- JWT Authentication
- bcrypt
- Helmet + CORS

**Frontend:**
- HTML5
- CSS3 / SCSS
- Vanilla JavaScript
- Bootstrap (if applicable)

## 📄 License

MIT
