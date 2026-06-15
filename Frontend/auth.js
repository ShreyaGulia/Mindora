
// ─────────────────────────────────────
// SIGNUP
// ─────────────────────────────────────
document.getElementById("signupForm")?.addEventListener("submit", async function(e) {
  e.preventDefault();

  const name     = document.getElementById("name")?.value.trim();
  const email    = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value;

  if (!name || !email || !password) {
    alert("Please fill all fields");
    return;
  }

  try {
    const res  = await fetch(`${API_BASE}/api/auth/signup`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Signup failed");
      return;
    }

    // save token and user info
    localStorage.setItem("mindoraToken",  data.token);
    localStorage.setItem("isLoggedIn",    "true");
    localStorage.setItem("mindoraUser",   JSON.stringify(data.user));
    localStorage.setItem("sessionExpiry", String(Date.now() + 30 * 60 * 1000));

    window.location.href = "index.html";

  } catch (err) {
    alert("Could not connect to server. Is the backend running?");
    console.error(err);
  }
});

// ─────────────────────────────────────
// LOGIN
// ─────────────────────────────────────
document.getElementById("loginForm")?.addEventListener("submit", async function(e) {
  e.preventDefault();

  const email    = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value;

  if (!email || !password) {
    alert("Please enter email and password");
    return;
  }

  try {
    const res  = await fetch(`${API_BASE}/api/auth/login`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Login failed");
      return;
    }

    // save token and user info
    localStorage.setItem("mindoraToken",  data.token);
    localStorage.setItem("isLoggedIn",    "true");
    localStorage.setItem("mindoraUser",   JSON.stringify(data.user));
    localStorage.setItem("sessionExpiry", String(Date.now() + 30 * 60 * 1000));

    // redirect back if we came from book-session or another page
    const redirectTo = new URLSearchParams(window.location.search).get('redirect');
    window.location.href = redirectTo ? decodeURIComponent(redirectTo) : 'index.html';

  } catch (err) {
    alert("Could not connect to server. Is the backend running?");
    console.error(err);
  }
});

// ─────────────────────────────────────
// LOGOUT (called from index.html)
// ─────────────────────────────────────
function logout() {
  localStorage.removeItem("mindoraToken");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("mindoraUser");
  localStorage.removeItem("sessionExpiry");
  window.location.href = "login.html";
}