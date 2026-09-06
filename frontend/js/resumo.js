import { api, resolveAssetUrl } from "./api.js";
import { requireAuth } from "./guard.js";
import { getBooking, resetBooking } from "./booking.js";
import { formatCents, formatDateLong } from "./format.js";

const CHECKIN_LABEL = {
  leva_ao_pet_shop: "Você leva o pet ao pet shop",
  busca_em_casa: "Buscamos o pet na sua casa",
};
const CHECKOUT_LABEL = {
  retira_no_pet_shop: "Você retira o pet no pet shop",
  entrega_em_casa: "Entregamos o pet na sua casa",
};

const user = await requireAuth();
if (user) {
  const booking = getBooking();
  if (!booking.service || !booking.checkinMode || !booking.checkoutMode) {
    window.location.replace("checkout.html");
  } else {
    document.getElementById("authLoading").style.display = "none";
    document.getElementById("screen").style.display = "flex";
    init(booking);
  }
}

function init(booking) {
  document.getElementById("petPhoto").innerHTML = booking.pet?.photo_url
    ? `<img src="${resolveAssetUrl(booking.pet.photo_url)}" alt="${booking.pet.name}">`
    : `<span class="material-symbols-rounded" aria-hidden="true">pets</span>`;
  document.getElementById("petName").textContent = booking.pet?.name || "";
  document.getElementById("serviceLine").textContent =
    `${booking.service.name} · ${formatDateLong(booking.date)} às ${booking.time}`;

  document.getElementById("checkinLine").innerHTML =
    `<span class="material-symbols-rounded" aria-hidden="true">check_circle</span> ${CHECKIN_LABEL[booking.checkinMode]}`;
  document.getElementById("checkoutLine").innerHTML =
    `<span class="material-symbols-rounded" aria-hidden="true">check_circle</span> ${CHECKOUT_LABEL[booking.checkoutMode]}`;

  if (booking.address) {
    document.getElementById("addressCard").style.display = "block";
    document.getElementById("addressLine").innerHTML =
      `${booking.address.street}, ${booking.address.number} — ${booking.address.neighborhood}<br>` +
      `${booking.address.city}/${booking.address.state} · CEP ${booking.address.cep}`;
  }

  const needsFee = booking.checkinMode === "busca_em_casa" || booking.checkoutMode === "entrega_em_casa";
  const pickupFeeCents = needsFee ? 1500 : 0;
  const totalCents = booking.service.price_cents + pickupFeeCents;

  document.getElementById("servicePriceLabel").textContent = `Serviço: ${booking.service.name}`;
  document.getElementById("servicePriceValue").textContent = formatCents(booking.service.price_cents);
  if (pickupFeeCents > 0) {
    document.getElementById("feeRow").style.display = "flex";
    document.getElementById("feeValue").textContent = formatCents(pickupFeeCents);
  }
  document.getElementById("totalValue").textContent = formatCents(totalCents);

  const confirmBtn = document.getElementById("confirmBtn");
  const errorEl = document.getElementById("errorMsg");

  confirmBtn.addEventListener("click", async () => {
    errorEl.style.display = "none";
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Confirmando...";
    try {
      let addressId = null;
      if (booking.address) {
        const { address } = await api.createAddress({ ...booking.address, is_default: true });
        addressId = address.id;
      }
      const { appointment } = await api.createAppointment({
        pet_id: booking.pet.id,
        service_id: booking.service.id,
        date: booking.date,
        time: booking.time,
        checkin_mode: booking.checkinMode,
        checkout_mode: booking.checkoutMode,
        address_id: addressId,
      });
      resetBooking();
      sessionStorage.setItem("cafofo_last_appointment", JSON.stringify(appointment));
      window.location.replace("sucesso.html");
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = "block";
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Avançar";
    }
  });
}
