import { requireAuth } from "./guard.js";
import { getBooking, updateBooking } from "./booking.js";

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
  }

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
