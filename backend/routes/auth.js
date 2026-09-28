import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db } from "../db/database.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

function normalizePhone(raw) {
  return String(raw || "").replace(/\D/g, "");
}

// POST /api/auth/login  { phone, name? }
// Entra (ou cria a conta) so com o telefone, sem codigo de verificacao.
router.post("/login", asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  if (phone.length < 10) {
    return res.status(400).json({ error: "Informe um numero de telefone valido." });
  }

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

// PATCH /api/auth/me  { name, phone }
router.patch("/me", requireAuth, asyncHandler(async (req, res) => {
  const user = await db.get(`SELECT * FROM users WHERE id = ?`, [req.userId]);
  if (!user) return res.status(404).json({ error: "Usuario nao encontrado." });

  const name = req.body.name !== undefined ? String(req.body.name).trim() : user.name;
  const phone = req.body.phone !== undefined ? normalizePhone(req.body.phone) : user.phone;

  if (!name) return res.status(400).json({ error: "Informe o nome." });
  if (phone.length < 10) return res.status(400).json({ error: "Informe um numero de telefone valido." });

  try {
    await db.run(`UPDATE users SET name = ?, phone = ? WHERE id = ?`, [name, phone, user.id]);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Este telefone ja esta em uso por outro usuario." });
    }
    throw err;
  }

  const updated = await db.get(`SELECT * FROM users WHERE id = ?`, [user.id]);
  res.json({ user: updated });
}));

export default router;
