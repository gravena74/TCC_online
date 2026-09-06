import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "troque-este-segredo-em-producao";

export function signAdminToken(admin) {
  return jwt.sign({ sub: admin.id, role: "admin" }, JWT_SECRET, { expiresIn: "12h" });
}

export function requireAdminAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Nao autenticado. Faca login novamente." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito ao administrador." });
    }
    req.adminId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Sessao expirada. Faca login novamente." });
  }
}
