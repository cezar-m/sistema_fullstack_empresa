import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432,
});

pool.connect()
  .then(() => console.log("✅ Banco conectado com sucesso!"))
  .catch(err => console.error("❌ Erro ao conectar no banco:", err.message));

export default pool;
