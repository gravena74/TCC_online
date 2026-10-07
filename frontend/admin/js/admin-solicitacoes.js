import { escapeHtml } from "../../js/html.js";
import { requireAdminAuth } from "./admin-auth.js";
import { renderAdminLayout } from "./admin-layout.js";
import { adminApi } from "./admin-api.js";
import { openAppointmentDetail, APPOINTMENT_STATUS_LABEL } from "./admin-appointment-detail.js";
import { formatCents, formatDateLong } from "../../js/format.js";

const admin = await requireAdminAuth();
if (admin) {
  renderAdminLayout("solicitacoes", admin.name || admin.username);
  init();
}

function init() {
  let allAppointments = [];
  let currentFilter = "em_analise";

  const loadingEl = document.getElementById("clientsLoading");
  const tableWrapEl = document.getElementById("clientsTableWrap");
  const tableBodyEl = document.getElementById("clientsTableBody");
  const emptyEl = document.getElementById("clientsEmpty");

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter;
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("filter-btn--active"));
      btn.classList.add("filter-btn--active");
      render();
    });
  });
  document.querySelector('.filter-btn[data-filter="em_analise"]').classList.add("filter-btn--active");

  function render() {
    const appointments =
      currentFilter === "todos" ? allAppointments : allAppointments.filter((a) => a.status === currentFilter);

    loadingEl.style.display = "none";

    if (appointments.length === 0) {
      tableWrapEl.style.display = "none";
      emptyEl.style.display = "block";
      return;
    }

    emptyEl.style.display = "none";
    tableWrapEl.style.display = "block";
    tableBodyEl.innerHTML = appointments
      .map(
        (a) => `
        <tr data-id="${escapeHtml(a.id)}">
          <td><strong>${escapeHtml(a.client_name || "—")}</strong></td>
          <td>${escapeHtml(a.pet_name)}</td>
          <td>${escapeHtml(a.service_name)}</td>
          <td>${escapeHtml(formatDateLong(a.date))} às ${escapeHtml(a.time)}</td>
          <td>${escapeHtml(formatCents(a.total_cents))}</td>
          <td><span class="admin-badge admin-badge--${escapeHtml(a.status)}">${escapeHtml(APPOINTMENT_STATUS_LABEL[a.status] || a.status)}</span></td>
          <td>
            ${
              a.status === "em_analise"
                ? `<button type="button" class="admin-icon-btn admin-icon-btn--approve" data-action="agendado" title="Aceitar">
                    <span class="material-symbols-rounded" aria-hidden="true">check</span>
                  </button>
                  <button type="button" class="admin-icon-btn admin-icon-btn--reject" data-action="recusado" title="Recusar">
                    <span class="material-symbols-rounded" aria-hidden="true">close</span>
                  </button>`
                : ""
            }
          </td>
        </tr>
      `
      )
      .join("");

    tableBodyEl.querySelectorAll("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const row = btn.closest("tr");
        btn.disabled = true;
        try {
          await adminApi.updateAppointmentStatus(row.dataset.id, btn.dataset.action);
          await load();
        } catch (err) {
          alert(err.message);
          btn.disabled = false;
        }
      });
    });

    tableBodyEl.querySelectorAll("tr[data-id]").forEach((row) => {
      row.addEventListener("click", () => {
        const appointment = appointments.find((a) => String(a.id) === row.dataset.id);
        if (appointment) openAppointmentDetail(appointment, { onStatusChange: load });
      });
    });
  }

  async function load() {
    const { appointments } = await adminApi.getReviewAppointments();
    allAppointments = appointments;
    render();
  }

  load();
}
