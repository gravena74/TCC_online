import mysql from "mysql2/promise";

// Padroes pensados para o XAMPP (MySQL/MariaDB local: root, sem senha).
// Em producao (Aiven etc.) defina tudo no .env / painel do host; para bancos
// gerenciados que exigem TLS use DB_SSL=true.
const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
};
const DB_NAME = process.env.DB_NAME || "cafofo_do_pet";
const sslOption = process.env.DB_SSL === "true" ? { ssl: { rejectUnauthorized: false } } : {};

const pool = mysql.createPool({
  ...dbConfig,
  ...sslOption,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

// Camada de compatibilidade com a API que o resto do projeto ja usava
// (node:sqlite / better-sqlite3): get/all/run, so que assincrona.
export const db = {
  async all(sql, params = []) {
    const [rows] = await pool.query(sql, params);
    return rows;
  },
  async get(sql, params = []) {
    const [rows] = await pool.query(sql, params);
    return rows[0];
  },
  async run(sql, params = []) {
    const [result] = await pool.query(sql, params);
    return { changes: result.affectedRows, lastInsertRowid: result.insertId };
  },
};

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id            VARCHAR(36) PRIMARY KEY,
    phone         VARCHAR(20) UNIQUE NOT NULL,
    name          VARCHAR(255),
    status        VARCHAR(20) NOT NULL DEFAULT 'pendente',
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS admins (
    id            VARCHAR(36) PRIMARY KEY,
    username      VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(255),
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS pets (
    id                VARCHAR(36) PRIMARY KEY,
    user_id           VARCHAR(36) NOT NULL,
    name              VARCHAR(255) NOT NULL,
    breed             VARCHAR(255),
    age_years         INT,
    size              VARCHAR(20),
    photo_url         VARCHAR(500),
    has_fleas_ticks   TINYINT(1),
    has_allergy       TINYINT(1),
    allows_perfume    TINYINT(1),
    been_to_petshop   TINYINT(1),
    is_aggressive     TINYINT(1),
    has_fur_knots     TINYINT(1),
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS services (
    id            VARCHAR(36) PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    description   TEXT,
    price_cents   INT NOT NULL,
    duration_min  INT NOT NULL DEFAULT 60,
    icon          VARCHAR(100)
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS vaccines (
    id            VARCHAR(36) PRIMARY KEY,
    pet_id        VARCHAR(36) NOT NULL,
    name          VARCHAR(255) NOT NULL,
    applied_at    VARCHAR(10) NOT NULL,
    next_dose_at  VARCHAR(10),
    notes         TEXT,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS addresses (
    id            VARCHAR(36) PRIMARY KEY,
    user_id       VARCHAR(36) NOT NULL,
    cep           VARCHAR(20),
    street        VARCHAR(255),
    number        VARCHAR(20),
    neighborhood  VARCHAR(255),
    city          VARCHAR(255),
    state         VARCHAR(2),
    is_default    TINYINT NOT NULL DEFAULT 0,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS appointments (
    id                    VARCHAR(36) PRIMARY KEY,
    user_id               VARCHAR(36) NOT NULL,
    pet_id                VARCHAR(36) NOT NULL,
    service_id            VARCHAR(36) NOT NULL,
    address_id            VARCHAR(36),
    date                  VARCHAR(10) NOT NULL,
    time                  VARCHAR(5) NOT NULL,
    checkin_mode          VARCHAR(30) NOT NULL,
    checkout_mode         VARCHAR(30) NOT NULL,
    status                VARCHAR(20) NOT NULL DEFAULT 'em_analise',
    service_price_cents   INT NOT NULL,
    pickup_fee_cents      INT NOT NULL DEFAULT 0,
    total_cents           INT NOT NULL,
    created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (address_id) REFERENCES addresses(id)
  ) ENGINE=InnoDB`,
];

export async function initDatabase() {
  // No XAMPP o banco ainda nao existe na primeira execucao: cria se preciso.
  // (Em hosts gerenciados sem permissao de CREATE DATABASE o erro e ignorado,
  // pois o banco ja vem criado.)
  try {
    const conn = await mysql.createConnection({ ...dbConfig, ...sslOption });
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.end();
  } catch (err) {
    if (err.code === "ECONNREFUSED") {
      throw new Error(
        `Nao foi possivel conectar ao MySQL em ${dbConfig.host}:${dbConfig.port}. ` +
          `Inicie o MySQL no painel do XAMPP.`
      );
    }
    console.warn("Aviso: nao foi possivel criar o banco automaticamente:", err.message);
  }

  for (const statement of SCHEMA_STATEMENTS) {
    await pool.query(statement);
  }

  // Migracao leve: adiciona a coluna "status" em bases criadas antes dela existir.
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pendente'`);
  } catch (err) {
    if (err.code !== "ER_DUP_FIELDNAME") throw err;
  }

  // Migracao leve: adiciona as novas perguntas de cadastro em bases ja existentes.
  const newPetColumns = [
    "has_fleas_ticks TINYINT(1)",
    "has_allergy TINYINT(1)",
    "allows_perfume TINYINT(1)",
    "been_to_petshop TINYINT(1)",
    "is_aggressive TINYINT(1)",
    "has_fur_knots TINYINT(1)",
  ];
  for (const column of newPetColumns) {
    try {
      await pool.query(`ALTER TABLE pets ADD COLUMN ${column}`);
    } catch (err) {
      if (err.code !== "ER_DUP_FIELDNAME") throw err;
    }
  }
}

export default db;
