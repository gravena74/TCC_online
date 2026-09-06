import { api } from "./api.js";
import { maskPhone } from "./masks.js";

const params = new URLSearchParams(window.location.search);
const returnTo = params.get("returnTo") || "home.html";

if (returnTo === "agendamentos.html") {
  document.getElementById("returnHint").style.display = "block";
}

const form = document.getElementById("loginForm");
const errorEl = document.getElementById("formError");
const submitBtn = document.getElementById("submitBtn");
const phoneInput = document.getElementById("phone");

phoneInput.addEventListener("input", () => {
  phoneInput.value = maskPhone(phoneInput.value);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.style.display = "none";

  const name = document.getElementById("name").value;
  const digits = document.getElementById("phone").value.replace(/\D/g, "");

  if (digits.length < 10) {
    errorEl.textContent = "Informe um telefone válido com DDD.";
    errorEl.style.display = "block";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando...";
  try {
    const res = await api.requestOtp(digits);
    sessionStorage.setItem(
      "cafofo_otp_context",
      JSON.stringify({ phone: digits, name, devCode: res.devCode, returnTo })
    );
    window.location.href = "verificar.html";
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = "block";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Avançar";
  }
});
