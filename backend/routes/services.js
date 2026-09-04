import { Router } from "express";
import { db } from "../db/database.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

// GET /api/services
router.get("/", asyncHandler(async (req, res) => {
  const services = await db.all(`SELECT * FROM services ORDER BY name`);
  res.json({ services });
}));

// GET /api/services/:id/slots?date=YYYY-MM-DD
// Retorna horarios disponiveis no dia (regra simples: 08:00-18:00 a cada 30min,
// removendo horarios ja ocupados por outros agendamentos daquele servico).
router.get("/:id/slots", asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "Informe a data (YYYY-MM-DD)." });

  const rows = await db.all(
    `SELECT time FROM appointments WHERE service_id = ? AND date = ? AND status != 'cancelado'`,
    [req.params.id, date]
  );
  const taken = rows.map((r) => r.time);

  const slots = [];
  for (let h = 8; h < 18; h++) {
    for (const m of [0, 30]) {
      const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      slots.push({ time, available: !taken.includes(time) });
    }
  }

  res.json({ date, slots });
}));

export default router;
