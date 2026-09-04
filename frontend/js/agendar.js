import { api } from "./api.js";
import { requireAuth } from "./guard.js";
import { getBooking, updateBooking } from "./booking.js";
import { formatCents, toIsoDate } from "./format.js";

const SERVICE_ICONS = { Banho: "bathtub", Tosa: "content_cut" };
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const user = await requireAuth();
if (user) {
  const booking = getBooking();
  if (!booking.pet) {
    window.location.replace("pets.html");
  } else {
    document.getElementById("authLoading").style.display = "none";
    document.getElementById("screen").style.display = "flex";
    init(booking);
  }
}

function init(booking) {
  const serviceListEl = document.getElementById("serviceList");
  const calendarLabel = document.getElementById("calendarLabel");
  const calendarDaysEl = document.getElementById("calendarDays");
  const slotsSection = document.getElementById("slotsSection");
  const slotsLoading = document.getElementById("slotsLoading");
  const slotsGrid = document.getElementById("slotsGrid");
  const errorMsg = document.getElementById("errorMsg");
  const summaryLine = document.getElementById("summaryLine");
  const advanceBtn = document.getElementById("advanceBtn");

  let services = [];
  let selectedService = booking.service || null;
  let viewMonth = (() => {
    const base = booking.date ? new Date(booking.date + "T00:00:00") : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  })();
  let selectedDate = booking.date || null;
  let selectedTime = booking.time || null;
  let slots = [];

  // Resumo do pet
  document.getElementById("petSummary").style.display = "flex";
  document.getElementById("petSummaryPhoto").innerHTML = booking.pet.photo_url
    ? `<img src="${booking.pet.photo_url}" alt="${booking.pet.name}">`
    : `<span class="material-symbols-rounded" aria-hidden="true">pets</span>`;
  document.getElementById("petSummaryName").textContent = booking.pet.name;
  document.getElementById("petSummaryBreed").textContent = booking.pet.breed || "";

  function renderServices() {
    serviceListEl.innerHTML = "";
    for (const service of services) {
      const active = selectedService?.id === service.id;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = `service-chip${active ? " service-chip--active" : ""}`;
      const iconName = SERVICE_ICONS[service.name] || "pets";
      chip.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${iconName}</span> ${service.name}`;
      chip.addEventListener("click", () => {
        selectedService = service;
        selectedTime = null;
        renderServices();
        loadSlots();
        updateSummary();
      });
      serviceListEl.appendChild(chip);
    }
  }

  function renderCalendar() {
    calendarLabel.textContent = `${MONTHS[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;
    calendarDaysEl.innerHTML = "";
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = startOfToday();

    for (let i = 0; i < startWeekday; i++) {
      calendarDaysEl.appendChild(document.createElement("span"));
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const iso = toIsoDate(date);
      const isPast = date < today;
      const isSelected = selectedDate === iso;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `calendar-day${isSelected ? " calendar-day--selected" : ""}`;
      btn.textContent = String(day);
      btn.disabled = isPast;
      btn.addEventListener("click", () => {
        selectedDate = iso;
        selectedTime = null;
        renderCalendar();
        loadSlots();
        updateSummary();
      });
      calendarDaysEl.appendChild(btn);
    }
  }

  function renderSlots() {
    slotsGrid.innerHTML = "";
    for (const slot of slots) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `slot-btn${selectedTime === slot.time ? " slot-btn--selected" : ""}`;
      btn.textContent = slot.time;
      btn.disabled = !slot.available;
      btn.addEventListener("click", () => {
        selectedTime = slot.time;
        renderSlots();
        updateSummary();
      });
      slotsGrid.appendChild(btn);
    }
  }

  function loadSlots() {
    if (!selectedService || !selectedDate) return;
    slotsSection.style.display = "block";
    slotsLoading.style.display = "block";
    slotsGrid.innerHTML = "";
    api
      .getSlots(selectedService.id, selectedDate)
      .then(({ slots: res }) => {
        slots = res;
        renderSlots();
      })
      .catch((err) => {
        errorMsg.textContent = err.message;
        errorMsg.style.display = "block";
      })
      .finally(() => {
        slotsLoading.style.display = "none";
      });
  }

  function updateSummary() {
    const canAdvance = Boolean(selectedService && selectedDate && selectedTime);
    advanceBtn.disabled = !canAdvance;
    if (selectedService && selectedTime) {
      summaryLine.style.display = "block";
      summaryLine.textContent = `Resumo: ${selectedService.name} · ${selectedTime} · ${formatCents(selectedService.price_cents)}`;
    } else {
      summaryLine.style.display = "none";
    }
  }

  document.getElementById("prevMonth").addEventListener("click", () => {
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
    renderCalendar();
  });
  document.getElementById("nextMonth").addEventListener("click", () => {
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
    renderCalendar();
  });

  advanceBtn.addEventListener("click", () => {
    if (!selectedService || !selectedDate || !selectedTime) return;
    updateBooking({ service: selectedService, date: selectedDate, time: selectedTime });
    window.location.href = "checkout.html";
  });

  api.getServices().then(({ services: res }) => {
    services = res;
    if (!selectedService && services.length) selectedService = services[0];
    renderServices();
    if (selectedDate) loadSlots();
    updateSummary();
  });

  renderCalendar();
  if (selectedDate) {
    slotsSection.style.display = "block";
  }
  updateSummary();
}
