import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432,
});

async function testConnection() {
  try {
    const client = await pool.connect(); // tenta pegar uma conexão
    console.log("✅ Banco conectado com sucesso!");
    client.release(); // libera a conexão
  } catch (err) {
    console.error("❌ Erro ao conectar no banco:", err.message);
  }
}

testConnection();

export default pool;
