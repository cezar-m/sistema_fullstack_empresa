import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import pg from "pg";
const { Pool } = pg;

// Pool configurado para produção/SSL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function testConnection() {
  try {
    console.log("DATABASE_URL:", process.env.DATABASE_URL);

    const client = await pool.connect();
    console.log("✅ Banco conectado!");
    client.release();
  } catch (err) {
    console.error("❌ Erro ao conectar no banco:", err.message || err);
  }
}

testConnection();

export default pool;
