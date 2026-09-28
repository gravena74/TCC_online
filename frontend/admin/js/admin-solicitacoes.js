import { requireAdminAuth } from "./admin-auth.js";
import { renderAdminLayout } from "./admin-layout.js";
import { adminApi } from "./admin-api.js";

const STATUS_LABEL = {
  pendente: "Em análise",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

const admin = await requireAdminAuth();
if (admin) {
  renderAdminLayout("solicitacoes", admin.name || admin.username);
  init();
}

function init() {
  let allClients = [];
  let currentFilter = "pendente";

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
  document.querySelector('.filter-btn[data-filter="pendente"]').classList.add("filter-btn--active");

  function render() {
    const clients = currentFilter === "todos" ? allClients : allClients.filter((c) => c.status === currentFilter);

    loadingEl.style.display = "none";

    if (clients.length === 0) {
      tableWrapEl.style.display = "none";
      emptyEl.style.display = "block";
      return;
    }

    emptyEl.style.display = "none";
    tableWrapEl.style.display = "block";
    tableBodyEl.innerHTML = clients
      .map(
        (c) => `
        <tr data-id="${c.id}">
          <td><strong>${c.name || "—"}</strong></td>
          <td>${c.phone}</td>
          <td>${c.appointments_count}</td>
          <td>${new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
          <td><span class="admin-badge admin-badge--${c.status}">${STATUS_LABEL[c.status] || c.status}</span></td>
          <td>
            ${
              c.status !== "aprovado"
                ? `<button type="button" class="admin-icon-btn admin-icon-btn--approve" data-action="aprovado" title="Aprovar">
                    <span class="material-symbols-rounded" aria-hidden="true">check</span>
                  </button>`
                : ""
            }
            ${
              c.status !== "reprovado"
                ? `<button type="button" class="admin-icon-btn admin-icon-btn--reject" data-action="reprovado" title="Reprovar">
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
      btn.addEventListener("click", async () => {
        const row = btn.closest("tr");
        btn.disabled = true;
        try {
          await adminApi.updateClientStatus(row.dataset.id, btn.dataset.action);
          await load();
        } catch (err) {
          alert(err.message);
          btn.disabled = false;
        }
      });
    });
  }

  async function load() {
    const { clients } = await adminApi.getClients();
    allClients = clients;
    render();
  }

  load();
}
