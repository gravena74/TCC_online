import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db } from "../db/database.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { isPast, isValidDate, isValidSlot } from "../utils/time.js";
import { serviceMatchesPet } from "../utils/appointments.js";

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

  if (![pet_id, service_id].every((value) => typeof value === "string") ||
      !isValidDate(date) || !isValidSlot(time)) {
    return res.status(400).json({ error: "Informe uma data valida (YYYY-MM-DD) e um horario entre 08:00 e 17:30, a cada 30 minutos." });
  }
  if (!["leva_ao_pet_shop", "busca_em_casa"].includes(checkin_mode) ||
      !["retira_no_pet_shop", "entrega_em_casa"].includes(checkout_mode)) {
    return res.status(400).json({ error: "Opcoes de check-in/check-out invalidas." });
  }
  if (isPast(date, time)) {
    return res.status(400).json({ error: "Este horario ja passou. Escolha outro." });
  }

  const needsPickupFee = checkin_mode === "busca_em_casa" || checkout_mode === "entrega_em_casa";
  if (needsPickupFee) {
    if (typeof address_id !== "string" || !address_id) {
      return res.status(400).json({ error: "Informe o endereco para busca/entrega." });
    }
    const address = await db.get(`SELECT id FROM addresses WHERE id = ? AND user_id = ?`, [address_id, req.userId]);
    if (!address) return res.status(404).json({ error: "Endereco nao encontrado." });
  }

  // Verificacao de conflito e INSERT na mesma transacao, com a linha do servico
  // travada (FOR UPDATE): requisicoes simultaneas para o mesmo servico esperam
  // umas pelas outras, entao so a primeira consegue o horario.
  const id = uuid();
  const outcome = await db.transaction(async (tx) => {
    const service = await tx.get(`SELECT * FROM services WHERE id = ? FOR UPDATE`, [service_id]);
    if (!service) return { status: 404, error: "Servico nao encontrado." };

    // A trava do pet tambem impede corrida com arquivamento ou troca de porte.
    const pet = await tx.get(`SELECT * FROM pets WHERE id = ? AND user_id = ? AND deleted_at IS NULL FOR UPDATE`, [pet_id, req.userId]);
    if (!pet) return { status: 404, error: "Pet nao encontrado." };
    if (!serviceMatchesPet(service, pet)) {
      return { status: 400, error: "Escolha um servico compativel com o porte atual do pet." };
    }

    const conflict = await tx.get(
      `SELECT id FROM appointments WHERE service_id = ? AND date = ? AND time = ? AND status NOT IN ('cancelado', 'recusado') FOR UPDATE`,
      [service_id, date, time]
    );
    if (conflict) return { status: 409, error: "Este horario acabou de ser reservado. Escolha outro." };

    const pickupFee = needsPickupFee ? PICKUP_FEE_CENTS : 0;
    const total = service.price_cents + pickupFee;

    // Todo agendamento novo entra "em analise": o pet shop precisa conferir os
    // dados do dono/pet antes de confirmar (vira "agendado") ou recusar.
    await tx.run(
      `INSERT INTO appointments
        (id, user_id, pet_id, service_id, address_id, date, time, checkin_mode, checkout_mode,
         status, service_price_cents, pickup_fee_cents, total_cents)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'em_analise', ?, ?, ?)`,
      [id, req.userId, pet_id, service_id, needsPickupFee ? address_id : null, date, time, checkin_mode, checkout_mode,
       service.price_cents, pickupFee, total]
    );
    return null;
  });
  if (outcome) return res.status(outcome.status).json({ error: outcome.error });

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
  const outcome = await db.transaction(async (tx) => {
    const appointment = await tx.get(`SELECT status FROM appointments WHERE id = ? AND user_id = ? FOR UPDATE`, [req.params.id, req.userId]);
    if (!appointment) return { status: 404, error: "Agendamento nao encontrado." };
    if (appointment.status === "cancelado") return null;
    if (!["em_analise", "agendado"].includes(appointment.status)) {
      return { status: 409, error: "Este agendamento nao pode ser cancelado." };
    }
    await tx.run(`UPDATE appointments SET status = 'cancelado' WHERE id = ?`, [req.params.id]);
    return null;
  });
  if (outcome) return res.status(outcome.status).json({ error: outcome.error });
  res.json({ ok: true });
}));

export default router;
