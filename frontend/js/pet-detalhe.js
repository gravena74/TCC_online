import { api } from "./api.js";
import { requireAuth } from "./guard.js";

const petId = new URLSearchParams(window.location.search).get("id");

// Datas de vacina cobrem anos diferentes, por isso formata com ano
// (formatDateLong, usada no fluxo de agendamento, omite o ano de propósito).
function formatDatePt(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const user = await requireAuth();
if (user) {
  if (!petId) {
    window.location.replace("pets.html?mode=manage");
  } else {
    document.getElementById("authLoading").style.display = "none";
    document.getElementById("screen").style.display = "flex";
    init();
  }
}

function init() {
  const loadingMsg = document.getElementById("loadingMsg");
  const loadErrorMsg = document.getElementById("loadErrorMsg");
  const content = document.getElementById("content");
  const screenTitle = document.getElementById("screenTitle");

  const petPhotoWrap = document.getElementById("petPhotoWrap");
  const petNameEl = document.getElementById("petName");
  const petMetaEl = document.getElementById("petMeta");
  const editPetBtn = document.getElementById("editPetBtn");

  const petDialog = document.getElementById("petDialog");
  const petForm = document.getElementById("petForm");
  const photoBtn = document.getElementById("photoUploadBtn");
  const petFormError = document.getElementById("petFormError");
  const savePetBtn = document.getElementById("savePetBtn");
  const cancelPetBtn = document.getElementById("cancelPetBtn");
  let photoFile = null;

  const vaccinesLoadingMsg = document.getElementById("vaccinesLoadingMsg");
  const vaccinesEmptyState = document.getElementById("vaccinesEmptyState");
  const vaccineList = document.getElementById("vaccineList");
  const addVaccineBtn = document.getElementById("addVaccineBtn");

  const vaccineDialog = document.getElementById("vaccineDialog");
  const vaccineDialogTitle = document.getElementById("vaccineDialogTitle");
  const vaccineForm = document.getElementById("vaccineForm");
  const vaccineNameInput = document.getElementById("vaccineName");
  const vaccineAppliedAtInput = document.getElementById("vaccineAppliedAt");
  const vaccineNextDoseAtInput = document.getElementById("vaccineNextDoseAt");
  const vaccineNotesInput = document.getElementById("vaccineNotes");
  const vaccineFormError = document.getElementById("vaccineFormError");
  const saveVaccineBtn = document.getElementById("saveVaccineBtn");
  const cancelVaccineBtn = document.getElementById("cancelVaccineBtn");

  const confirmDeleteVaccineDialog = document.getElementById("confirmDeleteVaccineDialog");
  const deleteVaccineMessage = document.getElementById("deleteVaccineMessage");
  const confirmDeleteVaccineBtn = document.getElementById("confirmDeleteVaccineBtn");
  const cancelDeleteVaccineBtn = document.getElementById("cancelDeleteVaccineBtn");

  let pet = null;
  let vaccines = [];
  let editingVaccineId = null;
  let deleteTargetId = null;

  loadPet();
  loadVaccines();

  function loadPet() {
    api
      .getPet(petId)
      .then((res) => {
        pet = res.pet;
        renderPetSummary();
        loadingMsg.style.display = "none";
        content.style.display = "block";
      })
      .catch((err) => {
        loadingMsg.style.display = "none";
        loadErrorMsg.textContent = err.message;
        loadErrorMsg.style.display = "block";
      });
  }

  function renderPetSummary() {
    screenTitle.textContent = pet.name;
    document.title = `${pet.name} — Cafofo do Pet`;
    petNameEl.textContent = pet.name;
    const metaParts = [pet.breed || "Sem raça definida"];
    if (pet.age_years) metaParts.push(`${pet.age_years} anos`);
    if (pet.size) metaParts.push(pet.size);
    petMetaEl.textContent = metaParts.join(" · ");

    petPhotoWrap.innerHTML = pet.photo_url
      ? `<img src="${pet.photo_url}" alt="${pet.name}">`
      : `<span class="material-symbols-rounded" aria-hidden="true">pets</span>`;
  }

  function resetPhotoPreview() {
    photoBtn.innerHTML = `
      <span class="material-symbols-rounded" id="photoPlaceholderIcon" aria-hidden="true">image</span>
      <span class="photo-upload__badge"><span class="material-symbols-rounded" aria-hidden="true">photo_camera</span></span>
      <input type="file" id="photoInput" accept="image/*" style="display: none;" />
    `;
    if (pet && pet.photo_url) {
      const img = document.createElement("img");
      img.src = pet.photo_url;
      img.alt = pet.name;
      photoBtn.querySelector(".material-symbols-rounded").replaceWith(img);
    }
  }

  editPetBtn.addEventListener("click", () => {
    petFormError.style.display = "none";
    photoFile = null;
    document.getElementById("name").value = pet.name || "";
    document.getElementById("age").value = pet.age_years || "";
    document.getElementById("breed").value = pet.breed || "";
    document.getElementById("size").value = pet.size || "";
    resetPhotoPreview();
    petDialog.showModal();
  });

  cancelPetBtn.addEventListener("click", () => petDialog.close());

  photoBtn.addEventListener("click", (e) => {
    if (e.target.closest("input")) return;
    photoBtn.querySelector("input[type=file]").click();
  });

  photoBtn.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    photoFile = file;
    const existingImg = photoBtn.querySelector("img");
    const img = existingImg || document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.alt = "Foto do pet";
    if (!existingImg) {
      photoBtn.querySelector(".material-symbols-rounded").replaceWith(img);
    }
  });

  petForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    petFormError.style.display = "none";

    const name = document.getElementById("name").value.trim();
    if (!name) {
      petFormError.textContent = "Digite o nome do pet.";
      petFormError.style.display = "block";
      return;
    }

    savePetBtn.disabled = true;
    savePetBtn.textContent = "Salvando...";
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("breed", document.getElementById("breed").value);
      formData.append("age_years", document.getElementById("age").value);
      formData.append("size", document.getElementById("size").value);
      if (photoFile) formData.append("photo", photoFile);

      const { pet: updated } = await api.updatePet(petId, formData);
      pet = updated;
      renderPetSummary();
      photoFile = null;
      petDialog.close();
    } catch (err) {
      petFormError.textContent = err.message;
      petFormError.style.display = "block";
    } finally {
      savePetBtn.disabled = false;
      savePetBtn.textContent = "Salvar alterações";
    }
  });

  function loadVaccines() {
    vaccinesLoadingMsg.style.display = "block";
    api
      .getVaccines(petId)
      .then((res) => {
        vaccines = res.vaccines;
        renderVaccines();
      })
      .catch((err) => {
        vaccinesLoadingMsg.textContent = err.message;
      })
      .finally(() => {
        vaccinesLoadingMsg.style.display = "none";
      });
  }

  function renderVaccines() {
    vaccinesEmptyState.style.display = vaccines.length === 0 ? "flex" : "none";
    vaccineList.innerHTML = "";

    for (const vaccine of vaccines) {
      const card = document.createElement("div");
      card.className = "card vaccine-card";

      const nextDose = vaccine.next_dose_at
        ? `<p class="vaccine-card__next"><span class="material-symbols-rounded" aria-hidden="true">event_repeat</span> Próxima dose: ${formatDatePt(vaccine.next_dose_at)}</p>`
        : "";
      const notes = vaccine.notes ? `<p class="vaccine-card__notes">${vaccine.notes}</p>` : "";

      card.innerHTML = `
        <div class="vaccine-card__top">
          <div class="vaccine-card__icon"><span class="material-symbols-rounded" aria-hidden="true">vaccines</span></div>
          <div class="vaccine-card__info">
            <p class="vaccine-card__name">${vaccine.name}</p>
            <p class="vaccine-card__applied">Aplicada em ${formatDatePt(vaccine.applied_at)}</p>
            ${nextDose}
            ${notes}
          </div>
          <div class="vaccine-card__actions">
            <button type="button" class="btn-round" aria-label="Editar vacina" data-action="edit">
              <span class="material-symbols-rounded" aria-hidden="true">edit</span>
            </button>
            <button type="button" class="btn-round" aria-label="Excluir vacina" data-action="delete">
              <span class="material-symbols-rounded" aria-hidden="true">delete</span>
            </button>
          </div>
        </div>
      `;

      card.querySelector('[data-action="edit"]').addEventListener("click", () => openVaccineDialog(vaccine));
      card.querySelector('[data-action="delete"]').addEventListener("click", () => {
        deleteTargetId = vaccine.id;
        deleteVaccineMessage.textContent = `Tem certeza que deseja excluir o registro de "${vaccine.name}"? Essa ação não pode ser desfeita.`;
        confirmDeleteVaccineDialog.showModal();
      });

      vaccineList.appendChild(card);
    }
  }

  function openVaccineDialog(vaccine) {
    editingVaccineId = vaccine ? vaccine.id : null;
    vaccineDialogTitle.textContent = vaccine ? "Editar vacina" : "Adicionar vacina";
    vaccineFormError.style.display = "none";
    vaccineNameInput.value = vaccine ? vaccine.name : "";
    vaccineAppliedAtInput.value = vaccine ? vaccine.applied_at : "";
    vaccineNextDoseAtInput.value = vaccine && vaccine.next_dose_at ? vaccine.next_dose_at : "";
    vaccineNotesInput.value = vaccine && vaccine.notes ? vaccine.notes : "";
    vaccineDialog.showModal();
  }

  addVaccineBtn.addEventListener("click", () => openVaccineDialog(null));
  cancelVaccineBtn.addEventListener("click", () => vaccineDialog.close());

  vaccineForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    vaccineFormError.style.display = "none";

    const name = vaccineNameInput.value.trim();
    const appliedAt = vaccineAppliedAtInput.value;
    if (!name || !appliedAt) {
      vaccineFormError.textContent = "Preencha o nome da vacina e a data de aplicação.";
      vaccineFormError.style.display = "block";
      return;
    }

    const payload = {
      name,
      applied_at: appliedAt,
      next_dose_at: vaccineNextDoseAtInput.value || null,
      notes: vaccineNotesInput.value.trim() || null,
    };

    saveVaccineBtn.disabled = true;
    saveVaccineBtn.textContent = "Salvando...";
    try {
      if (editingVaccineId) {
        await api.updateVaccine(editingVaccineId, payload);
      } else {
        await api.createVaccine(petId, payload);
      }
      vaccineDialog.close();
      loadVaccines();
    } catch (err) {
      vaccineFormError.textContent = err.message;
      vaccineFormError.style.display = "block";
    } finally {
      saveVaccineBtn.disabled = false;
      saveVaccineBtn.textContent = "Salvar";
    }
  });

  confirmDeleteVaccineBtn.addEventListener("click", async () => {
    if (!deleteTargetId) return;
    confirmDeleteVaccineBtn.disabled = true;
    confirmDeleteVaccineBtn.textContent = "Excluindo...";
    try {
      await api.deleteVaccine(deleteTargetId);
      confirmDeleteVaccineDialog.close();
      deleteTargetId = null;
      loadVaccines();
    } finally {
      confirmDeleteVaccineBtn.disabled = false;
      confirmDeleteVaccineBtn.textContent = "Sim, excluir";
    }
  });

  cancelDeleteVaccineBtn.addEventListener("click", () => {
    deleteTargetId = null;
    confirmDeleteVaccineDialog.close();
  });
}
