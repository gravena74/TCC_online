import { Router } from "express";
import { db } from "../db/database.js";
import { requireAdminAuth } from "../middleware/adminAuth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();
router.use(requireAdminAuth);

const CLIENT_STATUSES = ["pendente", "aprovado", "reprovado"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// Ultimos 12 meses no formato YYYY-MM, do mais antigo pro mais recente.
function last12Months() {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

// GET /api/admin/appointments/today
router.get("/appointments/today", asyncHandler(async (req, res) => {
  const date = todayIso();
  const appointments = await db.all(
    `SELECT a.*, u.name as client_name, u.phone as client_phone,
            p.name as pet_name, s.name as service_name
     FROM appointments a
     JOIN users u ON u.id = a.user_id
     JOIN pets p ON p.id = a.pet_id
     JOIN services s ON s.id = a.service_id
     WHERE a.date = ? AND a.status != 'cancelado'
     ORDER BY a.time ASC`,
    [date]
  );
  res.json({ date, appointments });
}));

// GET /api/admin/appointments?date=YYYY-MM-DD
router.get("/appointments", asyncHandler(async (req, res) => {
  const date = req.query.date || todayIso();
  const appointments = await db.all(
    `SELECT a.*, u.name as client_name, u.phone as client_phone,
            p.name as pet_name, s.name as service_name
     FROM appointments a
     JOIN users u ON u.id = a.user_id
     JOIN pets p ON p.id = a.pet_id
     JOIN services s ON s.id = a.service_id
     WHERE a.date = ? AND a.status != 'cancelado'
     ORDER BY a.time ASC`,
    [date]
  );
  res.json({ date, appointments });
}));

// GET /api/admin/appointments/calendar?month=YYYY-MM
router.get("/appointments/calendar", asyncHandler(async (req, res) => {
  const month = /^\d{4}-\d{2}$/.test(req.query.month || "") ? req.query.month : todayIso().slice(0, 7);
  const rows = await db.all(
    `SELECT date, COUNT(*) as count
     FROM appointments
     WHERE date LIKE ? AND status != 'cancelado'
     GROUP BY date`,
    [`${month}-%`]
  );
  res.json({ month, days: rows });
}));

// GET /api/admin/clients
router.get("/clients", asyncHandler(async (req, res) => {
  const clients = await db.all(
    `SELECT u.id, u.name, u.phone, u.status, u.created_at,
            (SELECT COUNT(*) FROM appointments a WHERE a.user_id = u.id) as appointments_count
     FROM users u
     ORDER BY u.created_at DESC`
  );
  res.json({ clients });
}));

// GET /api/admin/clients/pending
router.get("/clients/pending", asyncHandler(async (req, res) => {
  const clients = await db.all(
    `SELECT id, name, phone, status, created_at FROM users WHERE status = 'pendente' ORDER BY created_at DESC`
  );
  res.json({ clients });
}));

// PATCH /api/admin/clients/:id/status  { status }
router.patch("/clients/:id/status", asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!CLIENT_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Status invalido." });
  }

  const result = await db.run(`UPDATE users SET status = ? WHERE id = ?`, [status, req.params.id]);
  if (result.changes === 0) return res.status(404).json({ error: "Cliente nao encontrado." });

  const client = await db.get(`SELECT id, name, phone, status, created_at FROM users WHERE id = ?`, [req.params.id]);
  res.json({ client });
}));

// GET /api/admin/analytics
router.get("/analytics", asyncHandler(async (req, res) => {
  const months = last12Months();
  const sinceMonth = months[0];
  const sinceDate = `${sinceMonth}-01`;

  const [demandRows, revenueRows, pickupRows, clientsRows, totals, pending] = await Promise.all([
    db.all(
      `SELECT DATE_FORMAT(date, '%Y-%m') as month, COUNT(*) as count
       FROM appointments WHERE status != 'cancelado' AND date >= ?
       GROUP BY month`,
      [sinceDate]
    ),
    db.all(
      `SELECT DATE_FORMAT(date, '%Y-%m') as month, COALESCE(SUM(total_cents),0) as total_cents
       FROM appointments WHERE status != 'cancelado' AND date >= ?
       GROUP BY month`,
      [sinceDate]
    ),
    db.all(
      `SELECT DATE_FORMAT(date, '%Y-%m') as month,
              COALESCE(SUM(pickup_fee_cents),0) as total_cents,
              SUM(CASE WHEN pickup_fee_cents > 0 THEN 1 ELSE 0 END) as count
       FROM appointments WHERE status != 'cancelado' AND date >= ?
       GROUP BY month`,
      [sinceDate]
    ),
    db.all(
      `SELECT DATE_FORMAT(date, '%Y-%m') as month, COUNT(DISTINCT user_id) as count
       FROM appointments WHERE status != 'cancelado' AND date >= ?
       GROUP BY month`,
      [sinceDate]
    ),
    db.get(
      `SELECT COUNT(*) as appointments, COALESCE(SUM(total_cents),0) as revenue_cents,
              COUNT(DISTINCT user_id) as unique_clients
       FROM appointments WHERE status != 'cancelado'`
    ),
    db.get(`SELECT COUNT(*) as c FROM users WHERE status = 'pendente'`),
  ]);

  const toMap = (rows, key) => Object.fromEntries(rows.map((r) => [r.month, r[key]]));
  const demandMap = toMap(demandRows, "count");
  const revenueMap = toMap(revenueRows, "total_cents");
  const pickupTotalMap = toMap(pickupRows, "total_cents");
  const pickupCountMap = toMap(pickupRows, "count");
  const clientsMap = toMap(clientsRows, "count");

  res.json({
    monthlyDemand: months.map((m) => ({ month: m, count: demandMap[m] || 0 })),
    monthlyRevenue: months.map((m) => ({ month: m, total_cents: revenueMap[m] || 0 })),
    monthlyPickupFee: months.map((m) => ({
      month: m,
      total_cents: pickupTotalMap[m] || 0,
      count: pickupCountMap[m] || 0,
    })),
    monthlyClients: months.map((m) => ({ month: m, count: clientsMap[m] || 0 })),
    totals: {
      appointments: totals.appointments,
      revenueCents: totals.revenue_cents,
      uniqueClients: totals.unique_clients,
      pendingClients: pending.c,
    },
  });
}));

export default router;
