import { getToken } from "./api.js";

// Se já houver sessão, pula a tela de login e vai direto ao destino
// (as páginas protegidas confirmam o token de qualquer forma).
if (getToken()) {
  document.getElementById("agendarLink").href = "pets.html";
  document.getElementById("acompanharLink").href = "agendamentos.html";
}
