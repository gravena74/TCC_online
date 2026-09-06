import "dotenv/config";
import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";
import { db } from "./database.js";

const services = [
  { name: "Banho", description: "Banho completo com produtos hipoalergenicos", price_cents: 8000, duration_min: 60, icon: "bath" },
  { name: "Tosa", description: "Tosa higienica ou na tesoura, do jeito que seu pet gosta", price_cents: 10000, duration_min: 90, icon: "scissors" },
];

// Credenciais padrao do admin em desenvolvimento. Troque a senha em producao
// (ou defina ADMIN_DEFAULT_PASSWORD no .env antes do primeiro start).
const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || "admin123";

export async function seed() {
  const existing = await db.get(`SELECT COUNT(*) as c FROM services`);
  if (existing.c > 0) {
    console.log("Seed: servicos ja existem, nada a fazer.");
  } else {
    for (const s of services) {
      await db.run(
        `INSERT INTO services (id, name, description, price_cents, duration_min, icon) VALUES (?, ?, ?, ?, ?, ?)`,
        [uuid(), s.name, s.description, s.price_cents, s.duration_min, s.icon]
      );
    }
    console.log(`Seed: ${services.length} servicos inseridos.`);
  }

  const existingAdmin = await db.get(`SELECT COUNT(*) as c FROM admins`);
  if (existingAdmin.c > 0) {
    console.log("Seed: admin ja existe, nada a fazer.");
    return;
  }

  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
  await db.run(
    `INSERT INTO admins (id, username, password_hash, name) VALUES (?, ?, ?, ?)`,
    [uuid(), DEFAULT_ADMIN_USERNAME, passwordHash, "Administrador"]
  );
  console.log(`Seed: admin padrao criado (usuario: ${DEFAULT_ADMIN_USERNAME}, senha: ${DEFAULT_ADMIN_PASSWORD}).`);
}

// Permite rodar `npm run seed` diretamente, alem de ser importado pelo server.js
if (process.argv[1] && process.argv[1].endsWith("seed.js")) {
  const { initDatabase } = await import("./database.js");
  await initDatabase();
  await seed();
  process.exit(0);
}
