import { api, setToken } from "./api.js";

const raw = sessionStorage.getItem("cafofo_otp_context");
if (!raw) {
  window.location.replace("login.html");
}
const ctx = JSON.parse(raw || "{}");

if (ctx.devCode) {
  const hint = document.getElementById("devCodeHint");
  hint.textContent = `Modo de desenvolvimento: código ${ctx.devCode}`;
  hint.style.display = "block";
}

const form = document.getElementById("otpForm");
const codeInput = document.getElementById("code");
const errorEl = document.getElementById("formError");
const submitBtn = document.getElementById("submitBtn");

codeInput.addEventListener("input", () => {
  codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 4);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.style.display = "none";

  const code = codeInput.value;
  if (code.length < 4) {
    errorEl.textContent = "Digite os 4 dígitos do código.";
    errorEl.style.display = "block";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Verificando...";
  try {
    const { token } = await api.verifyOtp(ctx.phone, code, ctx.name);
    setToken(token);
    sessionStorage.removeItem("cafofo_otp_context");
    window.location.href = ctx.returnTo || "home.html";
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = "block";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Avançar";
  }
});
