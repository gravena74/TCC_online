import { api } from "./api.js";
import { requireAuth } from "./guard.js";
import { updateBooking } from "./booking.js";

const user = await requireAuth();
if (user) {
  document.getElementById("authLoading").style.display = "none";
  document.getElementById("screen").style.display = "flex";
  init();
}

function init() {
  const listEl = document.getElementById("petList");
  const loadingMsg = document.getElementById("loadingMsg");
  const errorMsg = document.getElementById("errorMsg");
  const emptyState = document.getElementById("emptyState");
  const advanceBtn = document.getElementById("advanceBtn");
  const dialog = document.getElementById("confirmDialog");
  const dialogMessage = document.getElementById("dialogMessage");
  const confirmCancelBtn = document.getElementById("confirmCancelBtn");
  const cancelCancelBtn = document.getElementById("cancelCancelBtn");

  let pets = [];
  let appointmentsByPet = {};
  let selectedId = null;
  let cancelTarget = null; // { appointmentId, petName }

  function loadData() {
    loadingMsg.style.display = "block";
    errorMsg.style.display = "none";
    listEl.innerHTML = "";
    Promise.all([api.getPets(), api.getAppointments()])
      .then(([petsRes, apptsRes]) => {
        pets = petsRes.pets;
        appointmentsByPet = {};
        for (const appt of apptsRes.appointments) {
          if (appt.status !== "agendado") continue;
          if (!appointmentsByPet[appt.pet_id]) appointmentsByPet[appt.pet_id] = appt;
        }
        render();
      })
      .catch((err) => {
        errorMsg.textContent = err.message;
        errorMsg.style.display = "block";
      })
      .finally(() => {
        loadingMsg.style.display = "none";
      });
  }

  function render() {
    emptyState.style.display = pets.length === 0 ? "flex" : "none";
    listEl.innerHTML = "";

    for (const pet of pets) {
      const appointment = appointmentsByPet[pet.id];
      const isBooked = Boolean(appointment);
      const active = selectedId === pet.id;

      const card = document.createElement("div");
      card.className = `card pet-card${isBooked ? " pet-card--booked" : ""}${active ? " pet-card--selected" : ""}`;

      const photo = pet.photo_url
        ? `<img src="${pet.photo_url}" alt="${pet.name}">`
        : `<span class="material-symbols-rounded" aria-hidden="true">pets</span>`;

      card.innerHTML = `
        <button type="button" class="pet-card__select" ${isBooked ? "disabled" : ""}>
          <div class="pet-card__photo">${photo}</div>
          <div class="pet-card__info">
            <p class="pet-card__name">${pet.name}</p>
            <p class="pet-card__meta">${pet.breed || "Sem raça definida"}${pet.age_years ? ` · ${pet.age_years} anos` : ""}</p>
            ${isBooked ? `<span class="pet-card__tag">Agendado · aguardando análise</span>` : ""}
          </div>
          ${
            !isBooked
              ? `<span class="pet-card__check"><span class="material-symbols-rounded" aria-hidden="true">check</span></span>`
              : ""
          }
        </button>
        ${isBooked ? `<button type="button" class="pet-card__cancel">Cancelar</button>` : ""}
      `;

      if (!isBooked) {
        card.querySelector(".pet-card__select").addEventListener("click", () => {
          selectedId = pet.id;
          advanceBtn.disabled = false;
          render();
        });
      } else {
        card.querySelector(".pet-card__cancel").addEventListener("click", () => {
          cancelTarget = { appointmentId: appointment.id, petName: pet.name };
          dialogMessage.textContent = `Tem certeza que deseja cancelar o agendamento de ${pet.name}? Essa ação não pode ser desfeita.`;
          dialog.showModal();
        });
      }

      listEl.appendChild(card);
    }
  }

  confirmCancelBtn.addEventListener("click", async () => {
    if (!cancelTarget) return;
    confirmCancelBtn.disabled = true;
    confirmCancelBtn.textContent = "Cancelando...";
    try {
      await api.cancelAppointment(cancelTarget.appointmentId);
      dialog.close();
      cancelTarget = null;
      loadData();
    } catch (err) {
      errorMsg.textContent = err.message;
      errorMsg.style.display = "block";
    } finally {
      confirmCancelBtn.disabled = false;
      confirmCancelBtn.textContent = "Sim, cancelar";
    }
  });

  cancelCancelBtn.addEventListener("click", () => {
    cancelTarget = null;
    dialog.close();
  });

  advanceBtn.addEventListener("click", () => {
    const pet = pets.find((p) => p.id === selectedId);
    if (!pet) return;
    updateBooking({ pet });
    window.location.href = "agendar.html";
  });

  loadData();
}
