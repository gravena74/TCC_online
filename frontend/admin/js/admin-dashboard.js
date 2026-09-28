import { requireAdminAuth } from "./admin-auth.js";
import { renderAdminLayout } from "./admin-layout.js";
import { adminApi } from "./admin-api.js";
import { formatCents, formatDateLong } from "../../js/format.js";

const STATUS_LABEL = {
  agendado: "Agendado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const admin = await requireAdminAuth();
if (admin) {
  renderAdminLayout("dashboard", admin.name || admin.username);
  init();
}

function renderStats(analytics) {
  const { totals } = analytics;
  document.getElementById("statsGrid").innerHTML = `
    <div class="admin-stat-card admin-stat-card--a">
      <span class="admin-stat-card__icon material-symbols-rounded" aria-hidden="true">event_available</span>
      <span class="admin-stat-card__value">${totals.appointments}</span>
      <span class="admin-stat-card__label">Agendamentos (12 meses)</span>
    </div>
    <div class="admin-stat-card admin-stat-card--b">
      <span class="admin-stat-card__icon material-symbols-rounded" aria-hidden="true">payments</span>
      <span class="admin-stat-card__value">${formatCents(totals.revenueCents)}</span>
      <span class="admin-stat-card__label">Faturamento (12 meses)</span>
    </div>
    <div class="admin-stat-card admin-stat-card--c">
      <span class="admin-stat-card__icon material-symbols-rounded" aria-hidden="true">group</span>
      <span class="admin-stat-card__value">${totals.uniqueClients}</span>
      <span class="admin-stat-card__label">Clientes ativos</span>
    </div>
    <div class="admin-stat-card admin-stat-card--d">
      <span class="admin-stat-card__icon material-symbols-rounded" aria-hidden="true">hourglass_top</span>
      <span class="admin-stat-card__value">${totals.pendingClients}</span>
      <span class="admin-stat-card__label">Clientes em análise</span>
    </div>
  `;
}

function renderToday(date, appointments) {
  document.getElementById("todayDateLabel").textContent = formatDateLong(date);
  document.getElementById("todayLoading").style.display = "none";

  if (appointments.length === 0) {
    document.getElementById("todayEmpty").style.display = "block";
    return;
  }

  document.getElementById("todayTableWrap").style.display = "block";
  document.getElementById("todayTableBody").innerHTML = appointments
    .map(
      (a) => `
      <tr>
        <td><strong>${a.time}</strong></td>
        <td>
          <div class="admin-table__cell-main">
            <strong>${a.client_name || "—"}</strong>
            <span>${a.client_phone || ""}</span>
          </div>
        </td>
        <td>${a.pet_name}</td>
        <td>${a.service_name}</td>
        <td>${formatCents(a.total_cents)}</td>
        <td><span class="admin-badge admin-badge--${a.status}">${STATUS_LABEL[a.status] || a.status}</span></td>
      </tr>
    `
    )
    .join("");
}

function renderPending(clients) {
  document.getElementById("pendingLoading").style.display = "none";

  if (clients.length === 0) {
    document.getElementById("pendingEmpty").style.display = "block";
    return;
  }

  document.getElementById("pendingTableWrap").style.display = "block";
  document.getElementById("pendingTableBody").innerHTML = clients
    .slice(0, 6)
    .map(
      (c) => `
      <tr data-id="${c.id}">
        <td><strong>${c.name || "—"}</strong></td>
        <td>${c.phone}</td>
        <td>${new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
        <td>
          <button type="button" class="admin-icon-btn admin-icon-btn--approve" data-action="aprovado" title="Aprovar">
            <span class="material-symbols-rounded" aria-hidden="true">check</span>
          </button>
          <button type="button" class="admin-icon-btn admin-icon-btn--reject" data-action="reprovado" title="Reprovar">
            <span class="material-symbols-rounded" aria-hidden="true">close</span>
          </button>
        </td>
      </tr>
    `
    )
    .join("");

  document.getElementById("pendingTableBody").querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest("tr");
      btn.disabled = true;
      try {
        await adminApi.updateClientStatus(row.dataset.id, btn.dataset.action);
        loadPending();
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
      }
    });
  });
}

function loadPending() {
  document.getElementById("pendingLoading").style.display = "block";
  document.getElementById("pendingTableWrap").style.display = "none";
  document.getElementById("pendingEmpty").style.display = "none";
  adminApi.getPendingClients().then(({ clients }) => renderPending(clients));
}

function init() {
  adminApi.getTodayAppointments().then(({ date, appointments }) => renderToday(date, appointments));
  adminApi.getAnalytics().then((analytics) => renderStats(analytics));
  loadPending();
}
