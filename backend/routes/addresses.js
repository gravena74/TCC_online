import { Router } from "express";
import { v4 as uuid } from "uuid";
import { db } from "../db/database.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();
router.use(requireAuth);

const norm = (v) =>
  String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

// Confere o CEP no ViaCEP e exige que cidade/UF (e rua/bairro, quando o CEP os define)
// batam com o que foi enviado — assim nao da pra salvar um endereco inventado
// mesmo chamando a API direto.
async function validateAgainstViaCep({ cep, street, neighborhood, city, state, number }) {
  const digits = String(cep || "").replace(/\D/g, "");
  if (digits.length !== 8) return "Informe um CEP valido com 8 digitos.";
  if (!/^(\d{1,6}[A-Za-z]?|s\/?n)$/i.test(String(number || "").trim())) {
    return "Informe o numero da residencia (ex: 120, 120A ou s/n).";
  }

  let data;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: AbortSignal.timeout(5000) });
    data = await res.json();
  } catch {
    return "Nao foi possivel validar o CEP agora. Tente novamente.";
  }
  if (data.erro) return "CEP nao encontrado.";

  if (norm(data.localidade) !== norm(city) || norm(data.uf) !== norm(state)) {
    return "Cidade/UF nao correspondem ao CEP informado.";
  }
  if (data.logradouro && norm(data.logradouro) !== norm(street)) {
    return "A rua nao corresponde ao CEP informado.";
  }
  if (data.bairro && norm(data.bairro) !== norm(neighborhood)) {
    return "O bairro nao corresponde ao CEP informado.";
  }
  if (!/\p{L}/u.test(String(street || ""))) return "Informe uma rua valida.";
  return null;
}

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

  const problem = await validateAgainstViaCep({ cep, street, neighborhood, city, state, number });
  if (problem) return res.status(400).json({ error: problem });

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
