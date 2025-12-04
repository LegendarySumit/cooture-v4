# Cooture v4

A full-stack fashion e-commerce platform with JWT authentication.

## 📁 Project Structure

```
Cooture v4/
├── backend/              # Node.js + Express backend
│   ├── .env             # Environment variables (JWT_SECRET, MONGO_URI, PORT)
│   ├── package.json     # Backend dependencies
│   ├── server.js        # Express server entry point
│   ├── middleware/      # Authentication middleware
│   ├── models/          # MongoDB models (User, etc.)
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
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
GEMINI_API_KEY=your_gemini_or_other_supported_ai_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta
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

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (requires JWT token)
- `POST /ai/generate` - Protected endpoint that proxies requests to Gemini

## 🛠️ Technologies

**Backend:**
- Node.js
- Express.js
- MongoDB + Mongoose
- JWT Authentication
- bcrypt

**Frontend:**
- HTML5
- CSS3 / SCSS
- Vanilla JavaScript
- Bootstrap (if applicable)

## 📄 License

MIT
