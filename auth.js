// auth.js (Supabase email/password auth)
document.addEventListener("DOMContentLoaded", async () => {
  const tabs = document.querySelectorAll(".x-tab");
  const loginPanel = document.getElementById("loginPanel");
  const registerPanel = document.getElementById("registerPanel");

  const loginStatus = document.getElementById("loginStatus");
  const regStatus = document.getElementById("regStatus");

  function show(tab) {
    tabs.forEach(t => t.classList.remove("active"));
    loginPanel.classList.remove("active");
    registerPanel.classList.remove("active");

    const btn = [...tabs].find(t => t.dataset.tab === tab);
    if (btn) btn.classList.add("active");
    (tab === "login" ? loginPanel : registerPanel).classList.add("active");
  }

  tabs.forEach(btn => {
    btn.addEventListener("click", () => show(btn.dataset.tab));
  });

  // If already signed in, go dashboard
  try {
    const { data: { user } } = await window.sb.auth.getUser();
    if (user) location.replace("./dashboard.html");
  } catch (_) {}

  loginPanel.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginStatus.textContent = "Signing in…";

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPass").value;

    const { error } = await window.sb.auth.signInWithPassword({ email, password });

    if (error) {
      loginStatus.textContent = error.message;
      return;
    }
    loginStatus.textContent = "Signed in. Redirecting…";
    location.replace("./dashboard.html");
  });

  registerPanel.addEventListener("submit", async (e) => {
    e.preventDefault();
    regStatus.textContent = "Creating account…";

    const username = document.getElementById("regUser").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const pass1 = document.getElementById("regPass").value;
    const pass2 = document.getElementById("regPass2").value;

    if (pass1.length < 8) {
      regStatus.textContent = "Password must be at least 8 characters.";
      return;
    }
    if (pass1 !== pass2) {
      regStatus.textContent = "Passwords do not match.";
      return;
    }

    const { data, error } = await window.sb.auth.signUp({
      email,
      password: pass1,
      options: { data: { username } }
    });

    if (error) {
      regStatus.textContent = error.message;
      return;
    }

    if (!data.session) {
      regStatus.textContent = "Account created. Check your email to confirm, then log in.";
      show("login");
    } else {
      regStatus.textContent = "Account created. Redirecting…";
      location.replace("./dashboard.html");
    }
  });
});
