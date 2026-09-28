import { adminApi, setAdminToken, getAdminToken } from "./admin-api.js";

if (getAdminToken()) {
  window.location.replace("dashboard.html");
}

const form = document.getElementById("adminLoginForm");
const errorEl = document.getElementById("formError");
const submitBtn = document.getElementById("submitBtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.style.display = "none";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    errorEl.textContent = "Informe usuário e senha.";
    errorEl.style.display = "block";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Entrando...";
  try {
    const { token } = await adminApi.login(username, password);
    setAdminToken(token);
    window.location.href = "dashboard.html";
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = "block";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Entrar";
  }
});
