import { requireAuth } from "./guard.js";
import { getBooking, updateBooking } from "./booking.js";
import { maskCep } from "./masks.js";

// APIs públicas e gratuitas, sem chave: ViaCEP resolve o endereço a partir do
// CEP e o Nominatim (OpenStreetMap) geocodifica endereço <-> coordenadas para
// exibir o mapa e preencher o formulário a partir da localização do usuário.
const VIACEP_URL = "https://viacep.com.br/ws";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org";

const user = await requireAuth();
if (user) {
  const booking = getBooking();
  if (!booking.service || !booking.date || !booking.time) {
    window.location.replace("agendar.html");
  } else {
    document.getElementById("authLoading").style.display = "none";
    document.getElementById("screen").style.display = "flex";
    init(booking);
  }
}

function init(booking) {
  const form = document.getElementById("checkoutForm");
  const errorEl = document.getElementById("errorMsg");
  const serviceLine = document.getElementById("serviceLine");
  const addressSection = document.querySelector(".address-section");
  const cepInput = document.getElementById("cep");
  const stateInput = document.getElementById("state");
  const streetInput = document.getElementById("street");
  const numberInput = document.getElementById("number");
  const neighborhoodInput = document.getElementById("neighborhood");
  const cityInput = document.getElementById("city");
  const cepStatus = document.getElementById("cepStatus");

  const mapCard = document.getElementById("mapCard");
  const mapCaption = document.getElementById("mapCaption");
  let map = null;
  let mapMarker = null;

  function showMap(lat, lon, caption) {
    mapCard.style.display = "block";
    if (!map) {
      map = L.map("addressMap", { attributionControl: false }).setView([lat, lon], 16);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);
      mapMarker = L.marker([lat, lon]).addTo(map);
    } else {
      map.setView([lat, lon], 16);
      mapMarker.setLatLng([lat, lon]);
    }
    mapCaption.textContent = caption || "";
    // O mapa é criado enquanto o card pode estar com largura 0 (recém-exibido);
    // sem isso o Leaflet mede o container errado e renderiza cortado.
    requestAnimationFrame(() => map.invalidateSize());
  }

  function setCepStatus(text, isError) {
    cepStatus.textContent = text;
    cepStatus.style.display = text ? "block" : "none";
    cepStatus.classList.toggle("form-hint--error", Boolean(isError));
  }

  async function geocodeAddress() {
    const street = streetInput.value.trim();
    const city = cityInput.value.trim();
    if (!street || !city) return;

    const query = [street, numberInput.value.trim(), neighborhoodInput.value.trim(), city, stateInput.value.trim(), "Brasil"]
      .filter(Boolean)
      .join(", ");

    try {
      const res = await fetch(
        `${NOMINATIM_URL}/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`
      );
      const results = await res.json();
      if (results && results[0]) {
        showMap(Number(results[0].lat), Number(results[0].lon), results[0].display_name);
      }
    } catch {
      // Mapa é um complemento visual — se a geocodificação falhar, o formulário
      // continua funcionando normalmente sem ele.
    }
  }

  async function lookupCep(cep) {
    setCepStatus("Buscando CEP...", false);
    try {
      const res = await fetch(`${VIACEP_URL}/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepStatus("CEP não encontrado.", true);
        return;
      }
      streetInput.value = data.logradouro || streetInput.value;
      neighborhoodInput.value = data.bairro || neighborhoodInput.value;
      cityInput.value = data.localidade || cityInput.value;
      stateInput.value = data.uf || stateInput.value;
      setCepStatus("Endereço preenchido a partir do CEP.", false);
      geocodeAddress();
    } catch {
      setCepStatus("Não foi possível buscar o CEP agora.", true);
    }
  }

  serviceLine.textContent = `Serviço selecionado: ${booking.service.name}`;

  if (booking.checkinMode) {
    form.querySelector(`input[name="checkin"][value="${booking.checkinMode}"]`).checked = true;
  }
  if (booking.checkoutMode) {
    form.querySelector(`input[name="checkout"][value="${booking.checkoutMode}"]`).checked = true;
  }
  if (booking.address) {
    document.getElementById("cep").value = booking.address.cep || "";
    document.getElementById("state").value = booking.address.state || "";
    document.getElementById("street").value = booking.address.street || "";
    document.getElementById("number").value = booking.address.number || "";
    document.getElementById("neighborhood").value = booking.address.neighborhood || "";
    document.getElementById("city").value = booking.address.city || "";
    geocodeAddress();
  }

  cepInput.addEventListener("input", () => {
    cepInput.value = maskCep(cepInput.value);
    const digits = cepInput.value.replace(/\D/g, "");
    if (digits.length === 8) lookupCep(digits);
  });

  [streetInput, numberInput, neighborhoodInput, cityInput].forEach((input) => {
    input.addEventListener("blur", () => geocodeAddress());
  });

  const useLocationBtn = document.getElementById("useLocationBtn");
  const locationDialog = document.getElementById("locationDialog");
  const locationStatus = document.getElementById("locationStatus");
  const locationStatusIcon = document.getElementById("locationStatusIcon");
  const locationStatusText = document.getElementById("locationStatusText");
  const locationAllowBtn = document.getElementById("locationAllowBtn");
  const locationCancelBtn = document.getElementById("locationCancelBtn");

  function setLocationStatus(text, state) {
    locationStatus.style.display = text ? "flex" : "none";
    locationStatusText.textContent = text;
    locationStatus.classList.toggle("location-dialog__status--error", state === "error");
    locationStatusIcon.textContent = state === "error" ? "error" : state === "ok" ? "check_circle" : "location_searching";
  }

  useLocationBtn.addEventListener("click", () => {
    setLocationStatus("", null);
    locationAllowBtn.disabled = false;
    locationAllowBtn.textContent = "Permitir e localizar";
    locationDialog.showModal();
  });

  locationCancelBtn.addEventListener("click", () => locationDialog.close());

  locationAllowBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      setLocationStatus("Seu navegador não suporta localização automática.", "error");
      return;
    }

    locationAllowBtn.disabled = true;
    setLocationStatus("Obtendo sua localização...", null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocationStatus("Localização obtida! Buscando o endereço...", null);
        try {
          const res = await fetch(
            `${NOMINATIM_URL}/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          const addr = data.address || {};
          const stateCode = (addr["ISO3166-2-lvl4"] || "").split("-")[1];
          streetInput.value = addr.road || streetInput.value;
          neighborhoodInput.value = addr.suburb || addr.neighbourhood || neighborhoodInput.value;
          cityInput.value = addr.city || addr.town || addr.village || cityInput.value;
          stateInput.value = stateCode || stateInput.value;
          if (addr.postcode) cepInput.value = maskCep(addr.postcode.replace(/\D/g, ""));

          showMap(latitude, longitude, data.display_name || "Sua localização");
          setLocationStatus("Endereço preenchido com sucesso!", "ok");
          setTimeout(() => locationDialog.close(), 900);
        } catch {
          showMap(latitude, longitude, "Sua localização");
          setLocationStatus("Localizamos você, mas não conseguimos identificar o endereço. Complete os campos manualmente.", "error");
        } finally {
          locationAllowBtn.disabled = false;
        }
      },
      (err) => {
        const messages = {
          1: "Permissão de localização negada.",
          2: "Não foi possível determinar sua localização.",
          3: "Tempo esgotado ao tentar localizar você.",
        };
        setLocationStatus(messages[err.code] || "Não foi possível obter sua localização.", "error");
        locationAllowBtn.disabled = false;
        locationAllowBtn.textContent = "Tentar novamente";
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  // O endereço só é necessário quando busca ou entrega em casa forem
  // escolhidas — escondida por padrão evita pedir um dado que não será usado.
  function updateAddressVisibility() {
    const checkinMode = form.querySelector('input[name="checkin"]:checked')?.value;
    const checkoutMode = form.querySelector('input[name="checkout"]:checked')?.value;
    const needsAddress = checkinMode === "busca_em_casa" || checkoutMode === "entrega_em_casa";
    addressSection.style.display = needsAddress ? "block" : "none";
  }

  form.querySelectorAll('input[name="checkin"], input[name="checkout"]').forEach((input) => {
    input.addEventListener("change", updateAddressVisibility);
  });
  updateAddressVisibility();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    errorEl.style.display = "none";

    const checkinMode = form.querySelector('input[name="checkin"]:checked')?.value || null;
    const checkoutMode = form.querySelector('input[name="checkout"]:checked')?.value || null;

    if (!checkinMode || !checkoutMode) {
      errorEl.textContent = "Escolha como será o check-in e o check-out.";
      errorEl.style.display = "block";
      return;
    }

    const needsAddress = checkinMode === "busca_em_casa" || checkoutMode === "entrega_em_casa";
    const address = {
      cep: document.getElementById("cep").value,
      state: document.getElementById("state").value,
      street: document.getElementById("street").value,
      number: document.getElementById("number").value,
      neighborhood: document.getElementById("neighborhood").value,
      city: document.getElementById("city").value,
    };

    if (needsAddress && (!address.street || !address.city)) {
      errorEl.textContent = "Preencha ao menos rua e cidade para a busca/entrega.";
      errorEl.style.display = "block";
      return;
    }

    updateBooking({
      checkinMode,
      checkoutMode,
      address: needsAddress ? address : null,
    });
    window.location.href = "resumo.html";
  });
}
