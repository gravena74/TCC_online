import { api } from "./api.js";
import { requireAuth } from "./guard.js";
import { populateBreedSelect } from "./breeds.js";

const isManageMode = new URLSearchParams(window.location.search).get("from") === "manage";
const backTarget = isManageMode ? "pets.html?mode=manage" : "pets.html";
document.getElementById("backLink").href = backTarget;

const user = await requireAuth();
if (user) {
  document.getElementById("authLoading").style.display = "none";
  document.getElementById("screen").style.display = "flex";
  init();
}

function init() {
  populateBreedSelect(document.getElementById("breed"));

  const form = document.getElementById("petForm");
  const photoBtn = document.getElementById("photoUploadBtn");
  const photoInput = document.getElementById("photoInput");
  const errorEl = document.getElementById("formError");
  const submitBtn = document.getElementById("submitBtn");
  let photoFile = null;
  let photoPreviewUrl = null;

  photoBtn.addEventListener("click", (event) => {
    if (event.target !== photoInput) photoInput.click();
  });

  photoInput.addEventListener("change", () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    photoFile = file;
    const existingImg = photoBtn.querySelector("img");
    const img = existingImg || document.createElement("img");
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    photoPreviewUrl = URL.createObjectURL(file);
    img.src = photoPreviewUrl;
    img.alt = "Foto do pet";
    if (!existingImg) document.getElementById("photoPlaceholderIcon").replaceWith(img);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.style.display = "none";

    const name = document.getElementById("name").value.trim();
    if (!name) {
      errorEl.textContent = "Digite o nome do pet.";
      errorEl.style.display = "block";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Cadastrando...";
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("breed", document.getElementById("breed").value);
      formData.append("age_years", document.getElementById("age").value);
      formData.append("size", document.getElementById("size").value);
      formData.append("has_fleas_ticks", document.getElementById("hasFleasTicks").value);
      formData.append("has_allergy", document.getElementById("hasAllergy").value);
      formData.append("allows_perfume", document.getElementById("allowsPerfume").value);
      formData.append("been_to_petshop", document.getElementById("beenToPetshop").value);
      formData.append("is_aggressive", document.getElementById("isAggressive").value);
      formData.append("has_fur_knots", document.getElementById("hasFurKnots").value);
      if (photoFile) formData.append("photo", photoFile);

      await api.createPet(formData);
      window.location.replace(backTarget);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = "block";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Cadastrar";
    }
  });
}
