// auth.js - everything for the login / register page

// grab the things we need from the page
const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

// if we are already logged in we go straight to the feed
fetch("/api/me")
  .then((res) => res.json())
  .then((data) => {
    if (data.user) {
      window.location.href = "feed.html";
    }
  });

// switch between the two tabs
function showLogin() {
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
  loginForm.hidden = false;
  registerForm.hidden = true;
}

function showRegister() {
  tabRegister.classList.add("active");
  tabLogin.classList.remove("active");
  registerForm.hidden = false;
  loginForm.hidden = true;
}

tabLogin.addEventListener("click", showLogin);
tabRegister.addEventListener("click", showRegister);

// ---------- login ----------

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault(); // stop the form from reloading the page

  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;
  const errorBox = document.getElementById("login-error");
  errorBox.textContent = "";

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: username, password: password }),
  });
  const data = await res.json();

  if (data.error) {
    errorBox.textContent = data.error;
  } else {
    window.location.href = "feed.html";
  }
});

// ---------- register ----------

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fullName = document.getElementById("reg-fullname").value;
  const username = document.getElementById("reg-username").value;
  const password = document.getElementById("reg-password").value;
  const errorBox = document.getElementById("reg-error");
  errorBox.textContent = "";

  const res = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: fullName,
      username: username,
      password: password,
    }),
  });
  const data = await res.json();

  if (data.error) {
    errorBox.textContent = data.error;
  } else {
    window.location.href = "feed.html";
  }
});
