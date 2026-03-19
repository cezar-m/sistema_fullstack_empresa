import 'dotenv/config';
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import express from "express";
import cors from "cors";
import path from "path";

// Import das rotas
import authRoutes from "./src/routes/auth.routes.js";
import usersRoutes from "./src/routes/users.routes.js";
import productsRoutes from "./src/routes/products.routes.js";
import categoriasRoutes from "./src/routes/categorias.routes.js";
import vendasRoutes from "./src/routes/vendas.routes.js";
import pagamentosRoutes from "./src/routes/pagamentos.routes.js";
import estoqueRoutes from "./src/routes/estoque.routes.js";
import formaPagamentoRoutes from "./src/routes/formaPagamento.routes.js";

const app = express();

// =====================
// CORS CONFIGURAÇÃO
// =====================
app.use(cors({
  origin: true,
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  credentials: true
}));

// =====================
// MIDDLEWARES
// =====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================
// ROTA RAIZ
// =====================
app.get("/", (req, res) => {
  res.send("API Sistema Empresa funcionando 🚀");
});

// =====================
// SERVIR IMAGENS
// =====================
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// =====================
// ROTAS
// =====================
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/categorias", categoriasRoutes);
app.use("/api/vendas", vendasRoutes);
app.use("/api/pagamentos", pagamentosRoutes);
app.use("/api/estoque", estoqueRoutes);
app.use("/api/formas-pagamento", formaPagamentoRoutes);

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log("CORS permitido para:", [
    "https://sistema-fullstack-empresa.vercel.app",
    "http://localhost:5000"
  ]);
});
