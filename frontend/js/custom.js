/* ============================================================
   CUSTOM.JS — Cooture v2
   Clean, scalable, production-friendly frontend logic
============================================================ */
const API_BASE =
    window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://cooture-v4.onrender.com";

(function () {
    "use strict";

    /* ------------------------------------------------------------
       1) THEME TOGGLE (Light/Dark)
    ------------------------------------------------------------ */
    const root = document.documentElement;
    const themeBtn = document.getElementById("themeToggle");
    const themeIcon = document.getElementById("themeIcon");
    const mobileThemeBtn = document.getElementById("mobileThemeToggle");
    const mobileThemeIcon = document.getElementById("mobileThemeIcon");
    const savedTheme = localStorage.getItem("cooture_theme");

    const applyTheme = (mode) => {
        root.setAttribute("data-bs-theme", mode);
    
        if (themeIcon) {
            themeIcon.className = mode === "dark" ? "bi bi-sun-fill" : "bi bi-moon-fill";
        }
        
        if (mobileThemeIcon) {
            mobileThemeIcon.className = mode === "dark" ? "bi bi-sun-fill" : "bi bi-moon-fill";
        }
    
        localStorage.setItem("cooture_theme", mode);
    };
    
    const toggleTheme = () => {
        const current = root.getAttribute("data-bs-theme");
        const next = current === "dark" ? "light" : "dark";
        applyTheme(next);
    };
    
    if (themeBtn || mobileThemeBtn) {
        applyTheme(savedTheme || "light");
    
        if (themeBtn) {
            themeBtn.addEventListener("click", toggleTheme);
        }
        
        if (mobileThemeBtn) {
            mobileThemeBtn.addEventListener("click", toggleTheme);
        }
    }
    /* ------------------------------------------------------------
       2) ScrollSpy Initialization
    ------------------------------------------------------------ */
    if (window.bootstrap && bootstrap.ScrollSpy) {
        new bootstrap.ScrollSpy(document.body, {
            target: "#mainNav",
            offset: 120,
        });
    }
    

    /* ------------------------------------------------------------
       3) Dashboard Offcanvas (Mobile nav)
    ------------------------------------------------------------ */
    const offcanvasElement = document.getElementById("dashboardOffcanvas");
    const offcanvasTrigger = document.getElementById("offcanvasToggle");

    if (offcanvasElement) {
        const offcanvas = new bootstrap.Offcanvas(offcanvasElement);

        offcanvasTrigger?.addEventListener("click", () => offcanvas.show());

        offcanvasElement.querySelectorAll(".nav-link").forEach((link) => {
            link.addEventListener("click", () => {
                if (window.innerWidth < 992) offcanvas.hide();
            });
        });
    }

    /* ------------------------------------------------------------
       4) Global Toast Manager (Reusable anywhere)
    ------------------------------------------------------------ */
    /* ------------------------------------------------------------
   4) Global Toast Manager (Beautiful UI)
------------------------------------------------------------ */
window.ToastManager = {
    container: document.getElementById("toastContainer"),

    show({ message = "", type = "success", delay = 4000 }) {
        if (!this.container) return;

        const id = `toast-${Date.now()}`;

        this.container.insertAdjacentHTML(
            "beforeend",
            `
            <div id="${id}" 
                 class="toast fade show text-bg-${type} border-0 shadow-lg rounded-3 mb-3"
                 role="alert" 
                 aria-live="assertive" 
                 aria-atomic="true"
                 data-bs-delay="${delay}">

                <div class="d-flex">
                    <div class="toast-body fw-semibold">
                        ${message}
                    </div>

                    <button type="button" 
                            class="btn-close btn-close-white me-2 m-auto"
                            data-bs-dismiss="toast"
                            aria-label="Close"></button>
                </div>
            </div>`
        );

        const el = document.getElementById(id);
        const toast = new bootstrap.Toast(el);

        toast.show();
        el.addEventListener("hidden.bs.toast", () => el.remove());
    },
};

    /* ------------------------------------------------------------
       5) Button Loading State Utility
    ------------------------------------------------------------ */
    window.setBtnLoading = function (button, state = true) {
        if (!button) return;

        if (state) {
            button.classList.add("btn--loading");
            button.disabled = true;
        } else {
            button.classList.remove("btn--loading");
            button.disabled = false;
        }
    };

    document.getElementById("signupSubmit")?.addEventListener("click", async () => {
        const email = document.getElementById("signupEmail").value.trim();
        const password = document.getElementById("signupPassword").value.trim();
    
        const errorBox = document.getElementById("signupError");
        errorBox.classList.add("d-none");
        errorBox.textContent = "";
    
        // HARD VALIDATION RULE — only @gmail.com
        if (!email.toLowerCase().endsWith("@gmail.com")) {
            errorBox.textContent = "Email must end with @gmail.com.";
            errorBox.classList.remove("d-none");
            return;
        }
    
        // username validation
        const username = email.split("@")[0];
        const usernamePattern = /^[a-zA-Z0-9._%+-]+$/;
    
        if (!usernamePattern.test(username)) {
            errorBox.textContent = "Enter a valid Gmail username (letters, numbers, . _ % + -).";
            errorBox.classList.remove("d-none");
            return;
        }
    
        if (username.length < 3) {
            errorBox.textContent = "Gmail username must be at least 3 characters.";
            errorBox.classList.remove("d-none");
            return;
        }
    
        // password validation
        if (password.length < 4 || password.length > 12) {
            errorBox.textContent = "Password must be 4 to 12 characters.";
            errorBox.classList.remove("d-none");
            return;
        }
    
        // Call API
        const btn = document.getElementById("signupSubmit");
        btn.disabled = true;
    
        try {
            const res = await fetch(`${API_BASE}/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
    
            const data = await res.json();
    
            if (!res.ok) {
                errorBox.textContent = data.message || "Signup failed.";
                errorBox.classList.remove("d-none");
                btn.disabled = false;
                return;
            }
    
            // IMPORTANT: save token + user
            localStorage.setItem("cooture_token", data.token);
            localStorage.setItem("cooture_user", JSON.stringify(data.user));
    
            // Update navbar visibility
            if (typeof updateNavbar === "function") updateNavbar();
    
            // Redirect to homepage
            window.location.href = "index.html";
    
        } catch (e) {
            errorBox.textContent = "Network error. Try again.";
            errorBox.classList.remove("d-none");
        } finally {
            btn.disabled = false;
        }
    });
    
    
    

    // LOGIN - client side (FINAL WORKING VERSION)
    document.getElementById("loginSubmit")?.addEventListener("click", async () => {
        const errorBox = document.getElementById("loginError");
    
        // Reset error box
        errorBox.textContent = "";
        errorBox.classList.add("d-none");
    
        // Grab fields
        const emailEl =
            document.querySelector('#loginForm input[type="email"]') ||
            document.querySelector('input[type="email"]');
    
        const email = (emailEl?.value || "").trim();
        const password = (document.getElementById("loginPassword") || {}).value || "";
    
        // EMAIL VALIDATION
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
        if (!email) {
            errorBox.textContent = "Please enter your email.";
            errorBox.classList.remove("d-none");
            return;
        }
    
        if (!emailPattern.test(email)) {
            errorBox.textContent = "Enter a valid email address.";
            errorBox.classList.remove("d-none");
            return;
        }
    
        // PASSWORD VALIDATION
        if (!password) {
            errorBox.textContent = "Please enter your password.";
            errorBox.classList.remove("d-none");
            return;
        }
    
        if (password.length < 4 || password.length > 12) {
            errorBox.textContent = "Password must be 4 to 12 characters.";
            errorBox.classList.remove("d-none");
            return;
        }
    
        // Disable button while logging in
        const btn = document.getElementById("loginSubmit");
        btn.disabled = true;
    
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
    
            const data = await res.json();
    
            if (res.ok) {
                // Save token
                localStorage.setItem("cooture_token", data.token);
    
                // Save user if backend returns it
                if (data.user) {
                    localStorage.setItem("cooture_user", JSON.stringify(data.user));
                }
    
                // Update navbar if function exists
                if (typeof updateNavbar === "function") updateNavbar();
    
                // Redirect to homepage
                window.location.href = "index.html";
            } else {
                // Show backend error (wrong password / no such user)
                errorBox.textContent = data.message || "Invalid credentials.";
                errorBox.classList.remove("d-none");
            }
        } catch (err) {
            errorBox.textContent = "Network error. Try again.";
            errorBox.classList.remove("d-none");
        } finally {
            btn.disabled = false;
        }
    });
    
    
    
 

})();

function togglePassword(id, iconId) {
    const input = document.getElementById(id);
    const icon = document.getElementById(iconId);

    if (input.type === "password") {
        input.type = "text";
        icon.className = "bi bi-eye-slash";
    } else {
        input.type = "password";
        icon.className = "bi bi-eye";
    }
}

document.getElementById("togglePass")?.addEventListener("click", () =>
    togglePassword("loginPassword", "togglePass")
);

document.getElementById("toggleSignupPass")?.addEventListener("click", () =>
    togglePassword("signupPassword", "toggleSignupPass")
);

// templates carousel custom controls
(function () {
  const carouselEl = document.getElementById('templatesCarousel');
  if (!carouselEl) return;

  const carousel = bootstrap.Carousel.getOrCreateInstance(carouselEl);
  const prev = document.getElementById('templatesPrev');
  const next = document.getElementById('templatesNext');

  prev?.addEventListener('click', () => carousel.prev());
  next?.addEventListener('click', () => carousel.next());

  // Optional: pause on focus of controls (accessibility nicety)
  [prev, next].forEach(btn => {
    btn?.addEventListener('focus', () => carousel.pause());
    btn?.addEventListener('blur', () => carousel.cycle());
  });
})();


/* ------------------------------------------------------------
   7) TEMPLATE GENERATOR — AI POWERED
------------------------------------------------------------ */
(function () {
    const generateBtn = document.getElementById("generateBtn");
    const randomBtn = document.getElementById("randomTemplateBtn");
    const outputBox = document.getElementById("outputBox");
    const outputCode = document.getElementById("outputCode");
    const promptInput = document.getElementById("promptInput");
    const copyCodeBtn = document.getElementById("copyCodeBtn");

    if (!generateBtn || !promptInput || !outputBox || !outputCode) return;

    /* COPY CODE BUTTON */
    copyCodeBtn?.addEventListener("click", () => {
        const code = outputCode.textContent;
        
        if (!code || code === "Generating your template with Gemini...") {
            ToastManager.show({
                message: "No code to copy yet.",
                type: "warning"
            });
            return;
        }

        navigator.clipboard.writeText(code).then(() => {
            // Change button text temporarily
            const originalHTML = copyCodeBtn.innerHTML;
            copyCodeBtn.innerHTML = '<i class="bi bi-check2"></i> Copied!';
            copyCodeBtn.classList.remove("btn-outline-primary");
            copyCodeBtn.classList.add("btn-success");
            
            setTimeout(() => {
                copyCodeBtn.innerHTML = originalHTML;
                copyCodeBtn.classList.remove("btn-success");
                copyCodeBtn.classList.add("btn-outline-primary");
            }, 2000);
        }).catch(err => {
            ToastManager.show({
                message: "Failed to copy code.",
                type: "danger"
            });
        });
    });

    /* PRESET PROMPTS */
    const presets = [
        "A clean SaaS homepage with hero, features, pricing, and CTA.",
        "A modern portfolio site with gallery and contact block.",
        "A business landing page with testimonials and service cards.",
        "A dashboard layout with sidebar and analytics.",
        "A blog homepage with featured posts and grid layout."
    ];

    randomBtn?.addEventListener("click", () => {
        const choice = presets[Math.floor(Math.random() * presets.length)];
        promptInput.value = choice;
    });

    /* ------------------------------------------------------------
       MAIN GENERATE FUNCTION
    ------------------------------------------------------------ */
    generateBtn.addEventListener("click", async () => {

        /* LOGIN PROTECTION */
        if (!isLoggedIn()) {
            setTimeout(() => window.location.href = "login.html", 1200);
            return;
        }

        const userPrompt = promptInput.value.trim();
        if (!userPrompt) {
            ToastManager.show({
                message: "Please type what kind of template you want.",
                type: "danger"
            });
            return;
        }

        setBtnLoading(generateBtn, true);
        outputBox.classList.remove("d-none");
        outputCode.textContent = "Generating your template with Gemini...";

          /* ------------------------------------------------------------
              BACKEND PROXY CALL
          ------------------------------------------------------------ */
          const promptText = userPrompt;

        try {
            /* --------------------------------------------------------
               CALL GEMINI API
            --------------------------------------------------------- */
            const response = await fetch(`${API_BASE}/ai/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`
                },
                body: JSON.stringify({ prompt: promptText })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to generate template.");
            }

            outputCode.textContent = data.html || "No output generated.";
        } catch (err) {
            ToastManager.show({
                message: "Error generating template: " + err.message,
                type: "danger"
            });
        } finally {
            setBtnLoading(generateBtn, false);
        }
    });

})();


// === AUTH FUNCTIONS (GLOBAL) ===

// return true if logged in
window.isLoggedIn = function () {
    return Boolean(localStorage.getItem("cooture_token"));
};

// return saved token
window.getToken = function () {
    return localStorage.getItem("cooture_token");
};

// logout user
window.logout = function () {
    localStorage.removeItem("cooture_token");
    updateNavbar();
    window.location.href = "index.html";
};


window.updateNavbar = function () {
    const loggedIn = localStorage.getItem("cooture_token");

    const loginBtn = document.getElementById("navLogin");
    const signupBtn = document.getElementById("navSignup");
    const profileBtn = document.getElementById("navProfile");

    if (loggedIn) {
        loginBtn?.classList.add("d-none");
        signupBtn?.classList.add("d-none");
        profileBtn?.classList.remove("d-none");
    } else {
        loginBtn?.classList.remove("d-none");
        signupBtn?.classList.remove("d-none");
        profileBtn?.classList.add("d-none");
    }
};

document.addEventListener("DOMContentLoaded", updateNavbar);
