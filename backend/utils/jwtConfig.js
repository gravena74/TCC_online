import "dotenv/config";

// Falha antes de subir a API se o segredo estiver ausente ou for o exemplo publico.
const secret = process.env.JWT_SECRET;
if (typeof secret !== "string" || Buffer.byteLength(secret.trim(), "utf8") < 32 ||
    ["troque-este-segredo-em-producao", "troque-este-segredo", "change-me"].includes(secret.trim())) {
  throw new Error("Configure JWT_SECRET com um segredo privado aleatorio de pelo menos 32 bytes antes de iniciar a API.");
}

export const JWT_SECRET = secret;
