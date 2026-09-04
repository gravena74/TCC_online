import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db } from "../db/database.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();
router.use(requireAuth);

// GET /api/addresses
router.get("/", asyncHandler(async (req, res) => {
  const addresses = await db.all(
    `SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC`,
    [req.userId]
  );
  res.json({ addresses });
}));

// POST /api/addresses
router.post("/", asyncHandler(async (req, res) => {
  const { cep, street, number, neighborhood, city, state, is_default } = req.body;
  if (!street || !city) {
    return res.status(400).json({ error: "Rua e cidade sao obrigatorias." });
  }

  const id = uuid();
  if (is_default) {
    await db.run(`UPDATE addresses SET is_default = 0 WHERE user_id = ?`, [req.userId]);
  }

  await db.run(
    `INSERT INTO addresses (id, user_id, cep, street, number, neighborhood, city, state, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, req.userId, cep || null, street, number || null, neighborhood || null, city, state || null, is_default ? 1 : 0]
  );

  const address = await db.get(`SELECT * FROM addresses WHERE id = ?`, [id]);
  res.status(201).json({ address });
}));

// DELETE /api/addresses/:id
router.delete("/:id", asyncHandler(async (req, res) => {
  const result = await db.run(`DELETE FROM addresses WHERE id = ? AND user_id = ?`, [req.params.id, req.userId]);
  if (result.changes === 0) return res.status(404).json({ error: "Endereco nao encontrado." });
  res.json({ ok: true });
}));

export default router;
