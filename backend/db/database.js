import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
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
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS otp_codes (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    phone         VARCHAR(20) NOT NULL,
    code          VARCHAR(10) NOT NULL,
    expires_at    DATETIME NOT NULL,
    consumed      TINYINT NOT NULL DEFAULT 0,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS pets (
    id            VARCHAR(36) PRIMARY KEY,
    user_id       VARCHAR(36) NOT NULL,
    name          VARCHAR(255) NOT NULL,
    breed         VARCHAR(255),
    age_years     INT,
    size          VARCHAR(20),
    photo_url     VARCHAR(500),
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    status                VARCHAR(20) NOT NULL DEFAULT 'agendado',
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
  for (const statement of SCHEMA_STATEMENTS) {
    await pool.query(statement);
  }
}

export default db;
