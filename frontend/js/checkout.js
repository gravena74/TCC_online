import { requireAuth } from "./guard.js";
import { getBooking, updateBooking } from "./booking.js";
import { maskCep } from "./masks.js";

// APIs públicas e gratuitas, sem chave: ViaCEP resolve o endereço a partir do
// CEP e o Nominatim (OpenStreetMap) geocodifica endereço <-> coordenadas para
// exibir o mapa e preencher o formulário a partir da localização do usuário.
const VIACEP_URL = "https://viacep.com.br/ws";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org";

// R. Gramados, 46 - Jardim Conceição, Hortolândia - SP, 13185-780
const STORE_LAT = -22.8660981;
const STORE_LON = -47.1586768;
const MAX_DISTANCE_KM = 6;

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

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
  const distanceStatus = document.getElementById("distanceStatus");
  let map = null;
  let mapMarker = null;
  let addressOutOfRange = false;

  function updateDistanceStatus(lat, lon) {
    const km = distanceKm(lat, lon, STORE_LAT, STORE_LON);
    addressOutOfRange = km > MAX_DISTANCE_KM;
    distanceStatus.style.display = "block";
    distanceStatus.classList.toggle("form-hint--error", addressOutOfRange);
    distanceStatus.textContent = addressOutOfRange
      ? `Endereço a ${km.toFixed(1)} km da loja — fora da nossa área de atendimento (até ${MAX_DISTANCE_KM} km). Escolha levar/retirar no pet shop.`
      : `Endereço a ${km.toFixed(1)} km da loja — dentro da área de atendimento.`;
  }

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
    updateDistanceStatus(lat, lon);
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

    addressOutOfRange = false;
    distanceStatus.style.display = "none";

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

  // Dados do último CEP validado no ViaCEP. Só um endereço vindo daqui é aceito:
  // os campos que o ViaCEP devolve ficam travados, então não dá pra inventar rua/cidade.
  let cepData = null;
  let lookupSeq = 0;

  function setLocked(input, locked) {
    input.readOnly = locked;
  }

  function unlockAddress() {
    cepData = null;
    addressOutOfRange = false;
    distanceStatus.style.display = "none";
    [stateInput, streetInput, neighborhoodInput, cityInput].forEach((i) => setLocked(i, false));
  }

  async function lookupCep(cep) {
    const seq = ++lookupSeq;
    cepData = null;
    setCepStatus("Buscando CEP...", false);
    try {
      const res = await fetch(`${VIACEP_URL}/${cep}/json/`);
      const data = await res.json();
      if (seq !== lookupSeq) return; // o usuário já digitou outro CEP
      if (data.erro) {
        unlockAddress();
        setCepStatus("CEP não encontrado. Confira o número digitado.", true);
        return;
      }
      cepData = { cep, uf: data.uf, city: data.localidade, street: data.logradouro, neighborhood: data.bairro };
      streetInput.value = data.logradouro || "";
      neighborhoodInput.value = data.bairro || "";
      cityInput.value = data.localidade || "";
      stateInput.value = data.uf || "";
      // Cidade/UF sempre vêm do CEP; rua e bairro só ficam livres se o CEP não os define
      // (CEPs "gerais" de cidades pequenas não têm logradouro).
      setLocked(cityInput, true);
      setLocked(stateInput, true);
      setLocked(streetInput, Boolean(data.logradouro));
      setLocked(neighborhoodInput, Boolean(data.bairro));
      setCepStatus("Endereço preenchido a partir do CEP.", false);
      geocodeAddress();
    } catch {
      if (seq !== lookupSeq) return;
      unlockAddress();
      setCepStatus("Não foi possível validar o CEP agora. Tente novamente.", true);
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
    const savedCep = (booking.address.cep || "").replace(/\D/g, "");
    if (savedCep.length === 8) lookupCep(savedCep);
  }

  cepInput.addEventListener("input", () => {
    cepInput.value = maskCep(cepInput.value);
    const digits = cepInput.value.replace(/\D/g, "");
    if (digits.length === 8) {
      lookupCep(digits);
    } else {
      lookupSeq++;
      if (cepData) unlockAddress();
      setCepStatus("", false);
    }
  });

  // Número: dígitos com letra opcional (12, 12A) ou "s/n".
  numberInput.addEventListener("input", () => {
    numberInput.value = numberInput.value.replace(/[^0-9a-zA-Z/]/g, "").slice(0, 8);
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
          const postcode = (addr.postcode || "").replace(/\D/g, "");
          if (postcode.length === 8) {
            cepInput.value = maskCep(postcode);
            lookupCep(postcode); // valida no ViaCEP e trava os campos
          } else {
            cepInput.value = "";
            unlockAddress();
            setCepStatus("Não identificamos o CEP da sua localização. Digite o CEP para validar o endereço.", true);
          }

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

    if (needsAddress) {
      const cepDigits = address.cep.replace(/\D/g, "");
      const fail = (msg) => {
        errorEl.textContent = msg;
        errorEl.style.display = "block";
      };
      if (cepDigits.length !== 8) return fail("Informe um CEP válido com 8 dígitos.");
      if (!cepData || cepData.cep !== cepDigits) {
        return fail("Aguarde a validação do CEP ou informe um CEP existente.");
      }
      const textOk = (v) => /^[\p{L}0-9 .'ºª-]{2,}$/u.test(v.trim());
      if (!textOk(address.street) || !/\p{L}/u.test(address.street)) return fail("Informe uma rua válida.");
      if (address.neighborhood && !textOk(address.neighborhood)) return fail("Informe um bairro válido.");
      if (!/^(\d{1,6}[A-Za-z]?|s\/?n)$/i.test(address.number.trim())) {
        return fail('Informe o número da residência (ex: 120, 120A ou "s/n").');
      }
      if (addressOutOfRange) {
        return fail(`Não atendemos esse endereço: a distância até a loja é maior que ${MAX_DISTANCE_KM} km. Escolha levar/retirar no pet shop.`);
      }
      // Cidade/UF vêm sempre do CEP validado, nunca do que estiver digitado.
      address.city = cepData.city;
      address.state = cepData.uf;
    }

    updateBooking({
      checkinMode,
      checkoutMode,
      address: needsAddress ? address : null,
    });
    window.location.href = "resumo.html";
  });
}
