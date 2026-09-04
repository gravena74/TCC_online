import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db } from "../db/database.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();
router.use(requireAuth);

const PICKUP_FEE_CENTS = 1500; // taxa de busca/entrega em casa

// GET /api/appointments  -> lista os agendamentos do usuario, com dados do pet e servico
router.get("/", asyncHandler(async (req, res) => {
  const rows = await db.all(
    `SELECT a.*, p.name as pet_name, p.photo_url as pet_photo, s.name as service_name
     FROM appointments a
     JOIN pets p ON p.id = a.pet_id
     JOIN services s ON s.id = a.service_id
     WHERE a.user_id = ?
     ORDER BY a.date DESC, a.time DESC`,
    [req.userId]
  );
  res.json({ appointments: rows });
}));

// POST /api/appointments
// { pet_id, service_id, date, time, checkin_mode, checkout_mode, address_id? }
router.post("/", asyncHandler(async (req, res) => {
  const { pet_id, service_id, date, time, checkin_mode, checkout_mode, address_id } = req.body;

  if (!pet_id || !service_id || !date || !time || !checkin_mode || !checkout_mode) {
    return res.status(400).json({ error: "Preencha pet, servico, data, horario e as opcoes de check-in/check-out." });
  }

  const pet = await db.get(`SELECT * FROM pets WHERE id = ? AND user_id = ?`, [pet_id, req.userId]);
  if (!pet) return res.status(404).json({ error: "Pet nao encontrado." });

  const service = await db.get(`SELECT * FROM services WHERE id = ?`, [service_id]);
  if (!service) return res.status(404).json({ error: "Servico nao encontrado." });

  const conflict = await db.get(
    `SELECT id FROM appointments WHERE service_id = ? AND date = ? AND time = ? AND status != 'cancelado'`,
    [service_id, date, time]
  );
  if (conflict) return res.status(409).json({ error: "Este horario acabou de ser reservado. Escolha outro." });

  const needsPickupFee = checkin_mode === "busca_em_casa" || checkout_mode === "entrega_em_casa";
  const pickupFee = needsPickupFee ? PICKUP_FEE_CENTS : 0;
  const total = service.price_cents + pickupFee;

  const id = uuid();
  await db.run(
    `INSERT INTO appointments
      (id, user_id, pet_id, service_id, address_id, date, time, checkin_mode, checkout_mode,
       service_price_cents, pickup_fee_cents, total_cents)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, req.userId, pet_id, service_id, address_id || null, date, time, checkin_mode, checkout_mode,
     service.price_cents, pickupFee, total]
  );

  const appointment = await db.get(
    `SELECT a.*, p.name as pet_name, s.name as service_name
     FROM appointments a JOIN pets p ON p.id = a.pet_id JOIN services s ON s.id = a.service_id
     WHERE a.id = ?`,
    [id]
  );

  res.status(201).json({ appointment });
}));

// PATCH /api/appointments/:id/cancel
router.patch("/:id/cancel", asyncHandler(async (req, res) => {
  const result = await db.run(
    `UPDATE appointments SET status = 'cancelado' WHERE id = ? AND user_id = ?`,
    [req.params.id, req.userId]
  );
  if (result.changes === 0) return res.status(404).json({ error: "Agendamento nao encontrado." });
  res.json({ ok: true });
}));

export default router;
