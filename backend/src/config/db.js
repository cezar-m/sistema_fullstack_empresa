import pg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // usar DATABASE_URL do Supabase
  ssl: {
    rejectUnauthorized: false, // necessário para Supabase
  },
});

export default pool;
