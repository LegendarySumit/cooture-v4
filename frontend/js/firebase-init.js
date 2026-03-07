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
  authDomain:        "cooture-e890c.firebaseapp.com",
  projectId:         "cooture-e890c",
  storageBucket:     "cooture-e890c.firebasestorage.app",
  messagingSenderId: "323784756365",
  appId:             "1:323784756365:web:e52690b2594e48994866c4",
  measurementId:     "G-LRE4NH5SPL"
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
