import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../utils/jwtConfig.js";
import { db } from "../db/database.js";
import { asyncHandler } from "./asyncHandler.js";

export function signAdminToken(admin) {
  return jwt.sign({ sub: admin.id, role: "admin" }, JWT_SECRET, { expiresIn: "12h" });
}

export const requireAdminAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Nao autenticado. Faca login novamente." });
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    if (payload.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito ao administrador." });
    }
  } catch (err) {
    return res.status(401).json({ error: "Sessao expirada. Faca login novamente." });
  }
  if (typeof payload.sub !== "string" || !payload.sub ||
      !await db.get(`SELECT id FROM admins WHERE id = ?`, [payload.sub])) {
    return res.status(401).json({ error: "Administrador nao encontrado. Faca login novamente." });
  }
  req.adminId = payload.sub;
  next();
});
