import { requireAdminAuth } from "./admin-auth.js";
import { renderAdminLayout } from "./admin-layout.js";
import { adminApi } from "./admin-api.js";
import { formatCents } from "../../js/format.js";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const admin = await requireAdminAuth();
if (admin) {
  renderAdminLayout("calendario", admin.name || admin.username);
  init();
}

function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function init() {
  const today = new Date();
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth(); // 0-indexed
  let selectedDate = toIsoDate(today);

  const monthLabelEl = document.getElementById("monthLabel");
  const gridEl = document.getElementById("calendarGrid");
  const dayListEl = document.getElementById("dayList");
  const dayEmptyEl = document.getElementById("dayEmpty");
  const selectedDayLabelEl = document.getElementById("selectedDayLabel");

  document.getElementById("prevMonthBtn").addEventListener("click", () => {
    viewMonth -= 1;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear -= 1;
    }
    loadMonth();
  });

  document.getElementById("nextMonthBtn").addEventListener("click", () => {
    viewMonth += 1;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear += 1;
    }
    loadMonth();
  });

  function loadMonth() {
    const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    monthLabelEl.textContent = new Date(viewYear, viewMonth, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });

    adminApi.getCalendarMonth(monthStr).then(({ days }) => renderGrid(days));
  }

  function renderGrid(days) {
    const countByDate = Object.fromEntries(days.map((d) => [d.date.slice(0, 10), d.count]));
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const todayIso = toIsoDate(new Date());

    let html = WEEKDAYS.map((w) => `<div class="admin-calendar-weekday">${w}</div>`).join("");

    for (let i = 0; i < startOffset; i++) {
      html += `<div class="admin-calendar-day admin-calendar-day--empty"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = toIsoDate(new Date(viewYear, viewMonth, d));
      const count = countByDate[iso] || 0;
      const classes = [
        "admin-calendar-day",
        iso === todayIso ? "admin-calendar-day--today" : "",
        iso === selectedDate ? "admin-calendar-day--selected" : "",
      ]
        .filter(Boolean)
        .join(" ");

      html += `
        <button type="button" class="${classes}" data-date="${iso}">
          ${count > 0 ? `<span class="admin-calendar-day__count">${count}</span>` : ""}
          <span>${d}</span>
          ${count > 0 ? `<span class="admin-calendar-day__dot"></span>` : ""}
        </button>
      `;
    }

    gridEl.innerHTML = html;
    gridEl.querySelectorAll("button[data-date]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedDate = btn.dataset.date;
        renderGrid(days);
        loadDay();
      });
    });
  }

  function loadDay() {
    selectedDayLabelEl.textContent = new Date(`${selectedDate}T00:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    dayListEl.innerHTML = "";
    dayEmptyEl.style.display = "none";

    adminApi.getAppointmentsByDate(selectedDate).then(({ appointments }) => {
      if (appointments.length === 0) {
        dayEmptyEl.style.display = "block";
        return;
      }

      dayListEl.innerHTML = appointments
        .map(
          (a) => `
          <div class="admin-day-appointment">
            <div class="admin-day-appointment__top">
              <span class="admin-day-appointment__time">${a.time}</span>
              <span class="admin-badge admin-badge--${a.status}">${a.status}</span>
            </div>
            <strong>${a.client_name || "—"}</strong>
            <span class="admin-day-appointment__meta">${a.pet_name} · ${a.service_name} · ${formatCents(a.total_cents)}</span>
          </div>
        `
        )
        .join("");
    });
  }

  loadMonth();
  loadDay();
}
