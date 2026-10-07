import fs from "node:fs";
import { randomBytes } from "node:crypto";
const envPath = new URL("../.env", import.meta.url);
if (fs.existsSync(envPath)) {
  console.log(".env ja existe; nenhum valor foi alterado.");
} else {
  const example = fs.readFileSync(new URL("../.env.example", import.meta.url), "utf8");
  fs.writeFileSync(envPath, example.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${randomBytes(32).toString("hex")}`), { flag: "wx", mode: 0o600 });
  console.log(".env local criado com JWT_SECRET privado. Confira a configuracao do banco antes de iniciar.");
}
