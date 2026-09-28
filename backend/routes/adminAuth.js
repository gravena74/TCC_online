import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db/database.js";
import { signAdminToken, requireAdminAuth } from "../middleware/adminAuth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

// POST /api/admin/auth/login  { username, password }
router.post("/login", asyncHandler(async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  if (!username || !password) {
    return res.status(400).json({ error: "Informe usuario e senha." });
  }

  const admin = await db.get(`SELECT * FROM admins WHERE username = ?`, [username]);
  if (!admin) return res.status(401).json({ error: "Usuario ou senha invalidos." });

  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) return res.status(401).json({ error: "Usuario ou senha invalidos." });

  const token = signAdminToken(admin);
  res.json({ token, admin: { id: admin.id, username: admin.username, name: admin.name } });
}));

// GET /api/admin/auth/me
router.get("/me", requireAdminAuth, asyncHandler(async (req, res) => {
  const admin = await db.get(`SELECT id, username, name FROM admins WHERE id = ?`, [req.adminId]);
  if (!admin) return res.status(404).json({ error: "Administrador nao encontrado." });
  res.json({ admin });
}));

export default router;
