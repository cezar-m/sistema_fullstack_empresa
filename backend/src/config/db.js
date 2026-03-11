import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log("✅ Banco conectado com sucesso!");
    client.release();
  } catch (err) {
    console.error("❌ Erro ao conectar no banco:", err);
  }
}

testConnection();

export default pool;
