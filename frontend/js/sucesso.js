import { requireAuth } from "./guard.js";
import { formatDateLong } from "./format.js";

const user = await requireAuth();
if (user) {
  const raw = sessionStorage.getItem("cafofo_last_appointment");
  if (!raw) {
    window.location.replace("pets.html");
  } else {
    const appointment = JSON.parse(raw);
    sessionStorage.removeItem("cafofo_last_appointment");

    document.getElementById("message").textContent =
      `${appointment.pet_name} está agendado(a) para ${appointment.service_name} em ` +
      `${formatDateLong(appointment.date)} às ${appointment.time}. Assim que o pet shop confirmar, você será avisado.`;

    document.getElementById("authLoading").style.display = "none";
    document.getElementById("screen").style.display = "flex";
  }
}
