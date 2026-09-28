import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db } from "../db/database.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();
router.use(requireAuth);

async function findOwnedPet(petId, userId) {
  return db.get(`SELECT * FROM pets WHERE id = ? AND user_id = ?`, [petId, userId]);
}

// GET /api/pets/:petId/vaccines
router.get("/pets/:petId/vaccines", asyncHandler(async (req, res) => {
  const pet = await findOwnedPet(req.params.petId, req.userId);
  if (!pet) return res.status(404).json({ error: "Pet nao encontrado." });

  const vaccines = await db.all(
    `SELECT * FROM vaccines WHERE pet_id = ? ORDER BY applied_at DESC`,
    [pet.id]
  );
  res.json({ vaccines });
}));

// POST /api/pets/:petId/vaccines  { name, applied_at, next_dose_at?, notes? }
router.post("/pets/:petId/vaccines", asyncHandler(async (req, res) => {
  const pet = await findOwnedPet(req.params.petId, req.userId);
  if (!pet) return res.status(404).json({ error: "Pet nao encontrado." });

  const { name, applied_at, next_dose_at, notes } = req.body;
  if (!name || !applied_at) {
    return res.status(400).json({ error: "Informe o nome da vacina e a data de aplicacao." });
  }

  const id = uuid();
  await db.run(
    `INSERT INTO vaccines (id, pet_id, name, applied_at, next_dose_at, notes) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, pet.id, name, applied_at, next_dose_at || null, notes || null]
  );

  const vaccine = await db.get(`SELECT * FROM vaccines WHERE id = ?`, [id]);
  res.status(201).json({ vaccine });
}));

// PATCH /api/vaccines/:id  { name, applied_at, next_dose_at?, notes? }
router.patch("/vaccines/:id", asyncHandler(async (req, res) => {
  const vaccine = await db.get(
    `SELECT v.* FROM vaccines v JOIN pets p ON p.id = v.pet_id WHERE v.id = ? AND p.user_id = ?`,
    [req.params.id, req.userId]
  );
  if (!vaccine) return res.status(404).json({ error: "Vacina nao encontrada." });

  const { name, applied_at, next_dose_at, notes } = req.body;
  await db.run(
    `UPDATE vaccines SET name = ?, applied_at = ?, next_dose_at = ?, notes = ? WHERE id = ?`,
    [
      name || vaccine.name,
      applied_at || vaccine.applied_at,
      next_dose_at !== undefined ? next_dose_at || null : vaccine.next_dose_at,
      notes !== undefined ? notes || null : vaccine.notes,
      vaccine.id,
    ]
  );

  const updated = await db.get(`SELECT * FROM vaccines WHERE id = ?`, [vaccine.id]);
  res.json({ vaccine: updated });
}));

// DELETE /api/vaccines/:id
router.delete("/vaccines/:id", asyncHandler(async (req, res) => {
  const result = await db.run(
    `DELETE v FROM vaccines v JOIN pets p ON p.id = v.pet_id WHERE v.id = ? AND p.user_id = ?`,
    [req.params.id, req.userId]
  );
  if (result.changes === 0) return res.status(404).json({ error: "Vacina nao encontrada." });
  res.json({ ok: true });
}));

export default router;
