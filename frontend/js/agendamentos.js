import { api, resolveAssetUrl } from "./api.js";
import { requireAuth } from "./guard.js";
import { formatCents, formatDateLong } from "./format.js";

const STATUS_LABEL = {
  agendado: { text: "Agendado", className: "status-badge--agendado" },
  concluido: { text: "Concluído", className: "status-badge--concluido" },
  cancelado: { text: "Cancelado", className: "status-badge--cancelado" },
};

const user = await requireAuth();
if (user) {
  document.getElementById("authLoading").style.display = "none";
  document.getElementById("screen").style.display = "flex";
  init();
}

function init() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("justBooked")) {
    document.getElementById("justBookedBanner").style.display = "block";
  }

  const loadingMsg = document.getElementById("loadingMsg");
  const emptyState = document.getElementById("emptyState");
  const listEl = document.getElementById("appointmentList");

  function load() {
    loadingMsg.style.display = "block";
    api
      .getAppointments()
      .then(({ appointments }) => render(appointments))
      .finally(() => {
        loadingMsg.style.display = "none";
      });
  }

  function render(appointments) {
    emptyState.style.display = appointments.length === 0 ? "flex" : "none";
    listEl.innerHTML = "";

    for (const a of appointments) {
      const status = STATUS_LABEL[a.status] || STATUS_LABEL.agendado;
      const photo = a.pet_photo
        ? `<img src="${resolveAssetUrl(a.pet_photo)}" alt="${a.pet_name}">`
        : `<span class="material-symbols-rounded" aria-hidden="true">pets</span>`;

      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="appointment-card__top">
          <div class="appointment-card__pet">
            <div class="appointment-card__photo">${photo}</div>
            <div>
              <p class="appointment-card__name">${a.pet_name}</p>
              <p class="appointment-card__meta">${a.service_name} · ${formatDateLong(a.date)} às ${a.time}</p>
            </div>
          </div>
          <span class="status-badge ${status.className}">${status.text}</span>
        </div>
        <div class="appointment-card__bottom">
          <span class="appointment-card__price">${formatCents(a.total_cents)}</span>
          ${a.status === "agendado" ? `<button type="button" class="btn-link" style="font-size: 0.75rem;">Cancelar</button>` : ""}
        </div>
      `;

      if (a.status === "agendado") {
        card.querySelector(".btn-link").addEventListener("click", async () => {
          await api.cancelAppointment(a.id);
          load();
        });
      }

      listEl.appendChild(card);
    }
  }

  load();
}
