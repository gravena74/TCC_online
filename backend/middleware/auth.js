import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "troque-este-segredo-em-producao";

export function signToken(user) {
  return jwt.sign({ sub: user.id, phone: user.phone }, JWT_SECRET, { expiresIn: "30d" });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Nao autenticado. Faca login novamente." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Sessao expirada. Faca login novamente." });
  }
}
