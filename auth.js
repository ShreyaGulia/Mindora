// ================= BASIC FUNCTIONS (KEEPING) =================
function setSessionExpiry(minutes = 30) {
  const expiry = Date.now() + minutes * 60 * 1000;
  localStorage.setItem("sessionExpiry", String(expiry));
}

function signup() {
  const name = document.getElementById("signupName")?.value;
  const email = document.getElementById("signupEmail")?.value;
  const password = document.getElementById("signupPassword")?.value;

  if (!name || !email || !password) {
    alert("Please fill all fields");
    return;
  }

  // ✅ Save user data
  localStorage.setItem(
    "mindoraUser",
    JSON.stringify({ name, email, password })
  );
  // ✅ VERY IMPORTANT FLAG
  localStorage.setItem("isLoggedIn", "true");

  // ✅ Go to main website
  window.location.replace("index.html");

  const user = { name, email, password };

  localStorage.setItem("mindoraUser", JSON.stringify(user));
  localStorage.setItem("isLoggedIn", "true");
  setSessionExpiry(30);
  window.location.href = "index.html";
}

function login() {
  const email = document.getElementById("loginEmail")?.value;
  const password = document.getElementById("loginPassword")?.value;

  const savedUser = JSON.parse(localStorage.getItem("mindoraUser"));

  if (!savedUser) {
    alert("No account found. Please sign up.");
    return;
  }

  if (email === savedUser.email && password === savedUser.password) {
    localStorage.setItem("isLoggedIn", "true");
    setSessionExpiry(30);
    window.location.replace("index.html");
  } else {
    alert("Invalid credentials");
  }
}

function logout() {
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("mindoraUser");
  localStorage.removeItem("sessionExpiry");
  window.location.replace("login.html");
}

// ================= FORM-BASED AUTH (FIXED) =================

document.addEventListener("DOMContentLoaded", () => {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const user = JSON.parse(localStorage.getItem("mindoraUser"));

  // ✅ If already logged in, don't show login/signup
  if (isLoggedIn && user) {
    window.location.replace("index.html");
    return;
  }

  // 🚫 Prevent logged-in user from opening login/signup again
  if (
    (location.pathname.includes("login") ||
     location.pathname.includes("signup")) &&
    localStorage.getItem("isLoggedIn") === "true"
  ) {
    window.location.href = "index.html";
  }

  // ✅ SIGNUP FORM
  document.getElementById("signupForm")?.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("name")?.value;
    const email = document.getElementById("email")?.value;
    const password = document.getElementById("password")?.value;

    if (!name || !email || !password) {
      alert("Please fill all fields");
      return;
    }

    const user = { name, email, password };

    localStorage.setItem("mindoraUser", JSON.stringify(user));
    localStorage.setItem("isLoggedIn", "true");

    alert("Signup successful 🌱");
    window.location.href = "index.html";
  });

  // ✅ LOGIN FORM
  document.getElementById("loginForm")?.addEventListener("submit", function (e) {
    e.preventDefault();

    const email = document.getElementById("loginEmail")?.value;
    const password = document.getElementById("loginPassword")?.value;

    const user = JSON.parse(localStorage.getItem("mindoraUser"));

    if (!user) {
      alert("No account found. Please sign up.");
      return;
    }

    if (email === user.email && password === user.password) {
      localStorage.setItem("isLoggedIn", "true");
      alert("Welcome back 🌿");
      window.location.href = "index.html";
    } else {
      alert("Invalid credentials ❌");
    }
  });
});
