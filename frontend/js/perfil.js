import { api, logout } from "./api.js";
import { requireAuth } from "./guard.js";
import { maskPhone } from "./masks.js";

const user = await requireAuth();
if (user) {
  document.getElementById("authLoading").style.display = "none";
  document.getElementById("screen").style.display = "flex";
  init(user);
}

function init(initialUser) {
  let user = initialUser;

  const nameEl = document.getElementById("profileName");
  const phoneEl = document.getElementById("profilePhone");

  const dialog = document.getElementById("profileDialog");
  const form = document.getElementById("profileForm");
  const nameInput = document.getElementById("name");
  const phoneInput = document.getElementById("phone");
  const errorEl = document.getElementById("profileFormError");
  const saveBtn = document.getElementById("saveProfileBtn");

  const logoutDialog = document.getElementById("confirmLogoutDialog");

  function render() {
    nameEl.textContent = user.name || "Sem nome cadastrado";
    phoneEl.textContent = maskPhone(user.phone || "");
  }
  render();

  phoneInput.addEventListener("input", () => {
    phoneInput.value = maskPhone(phoneInput.value);
  });

  document.getElementById("editProfileBtn").addEventListener("click", () => {
    errorEl.style.display = "none";
    nameInput.value = user.name || "";
    phoneInput.value = maskPhone(user.phone || "");
    dialog.showModal();
  });

  document.getElementById("cancelProfileBtn").addEventListener("click", () => dialog.close());

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.style.display = "none";

    const name = nameInput.value.trim();
    const digits = phoneInput.value.replace(/\D/g, "");
    if (!name) {
      errorEl.textContent = "Digite seu nome.";
      errorEl.style.display = "block";
      return;
    }
    if (digits.length < 10) {
      errorEl.textContent = "Informe um telefone válido com DDD.";
      errorEl.style.display = "block";
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Salvando...";
    try {
      const { user: updated } = await api.updateMe({ name, phone: digits });
      user = updated;
      render();
      dialog.close();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = "block";
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Salvar alterações";
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", () => logoutDialog.showModal());
  document.getElementById("cancelLogoutBtn").addEventListener("click", () => logoutDialog.close());
  document.getElementById("confirmLogoutBtn").addEventListener("click", () => {
    logout();
    window.location.replace("index.html");
  });
}
