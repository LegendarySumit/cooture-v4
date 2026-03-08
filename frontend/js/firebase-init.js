// ============================================================
//  COOTURE — Firebase Initialization
//  Replace the config values below with your own from:
//  Firebase Console → Project Settings → General → Your apps
//
//  Firebase web API keys are public by design (client-side).
//  Security = Firebase Auth rules + restricting the API key
//  to your domain in Google Cloud Console:
//  console.cloud.google.com → APIs & Services → Credentials
// ============================================================

const firebaseConfig = {
  apiKey:            "",
  authDomain:        "cooture-d8abf.firebaseapp.com",
  projectId:         "cooture-d8abf",
  storageBucket:     "cooture-d8abf.firebasestorage.app",
  messagingSenderId: "602630896119",
  appId:             "1:602630896119:web:8f90512a0ed2bfd46e16f2",
  measurementId:     "G-5KLFSXBHLW"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const _fbAuth = firebase.auth();

// Persist session across tabs
_fbAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// Global helpers used by all pages
window.__fbAuth     = _fbAuth;
window.__fbProvider = new firebase.auth.GoogleAuthProvider();
window.__fbProvider.addScope("profile");
window.__fbProvider.addScope("email");

window.__fbSignOut = function () {
  return _fbAuth.signOut();
};
