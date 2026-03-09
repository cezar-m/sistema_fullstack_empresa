import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  ssl: {
    rejectUnauthorized: false, // ESSENCIAL para Supabase
  },
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log("✅ Banco conectado com sucesso!");
    client.release();
  } catch (err) {
    console.error("❌ Erro ao conectar no banco:", err.message);
  }
}

testConnection();

export default pool;
