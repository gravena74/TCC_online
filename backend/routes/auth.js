import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db } from "../db/database.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

// Em desenvolvimento o codigo e sempre fixo, para nao depender de um provedor de SMS pago.
const MOCK_OTP = "1234";
const OTP_TTL_MINUTES = 5;

function normalizePhone(raw) {
  return String(raw || "").replace(/\D/g, "");
}

// POST /api/auth/request-otp  { phone }
router.post("/request-otp", asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  if (phone.length < 10) {
    return res.status(400).json({ error: "Informe um numero de telefone valido." });
  }

  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
  await db.run(
    `INSERT INTO otp_codes (phone, code, expires_at) VALUES (?, ?, ?)`,
    [phone, MOCK_OTP, expiresAt]
  );

  // Modo simulado: devolvemos o codigo na resposta so para facilitar o desenvolvimento.
  // Num provedor real (ex: Twilio), aqui voce dispararia o SMS e NAO devolveria o codigo.
  res.json({
    ok: true,
    message: "Codigo de verificacao enviado.",
    devCode: MOCK_OTP,
  });
}));

// POST /api/auth/verify-otp  { phone, code, name? }
router.post("/verify-otp", asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const code = String(req.body.code || "");

  const otp = await db.get(
    `SELECT * FROM otp_codes WHERE phone = ? AND code = ? AND consumed = 0
     ORDER BY created_at DESC LIMIT 1`,
    [phone, code]
  );

  if (!otp) {
    return res.status(400).json({ error: "Codigo invalido." });
  }
  if (new Date(otp.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: "Codigo expirado. Solicite um novo." });
  }

  await db.run(`UPDATE otp_codes SET consumed = 1 WHERE id = ?`, [otp.id]);

  let user = await db.get(`SELECT * FROM users WHERE phone = ?`, [phone]);
  if (!user) {
    const id = uuid();
    await db.run(
      `INSERT INTO users (id, phone, name) VALUES (?, ?, ?)`,
      [id, phone, req.body.name || null]
    );
    user = await db.get(`SELECT * FROM users WHERE id = ?`, [id]);
  }

  const token = signToken(user);
  res.json({ token, user });
}));

// GET /api/auth/me
router.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const user = await db.get(`SELECT * FROM users WHERE id = ?`, [req.userId]);
  if (!user) return res.status(404).json({ error: "Usuario nao encontrado." });
  res.json({ user });
}));

export default router;
