import { Router } from "express";
import auth from "../middlewares/auth.js";
import * as controller from "../controllers/pagamento.controller.js";

const router = Router();

router.post("/", auth, controller.criarPagamento);
router.put("/pago/:id", auth, controller.marcarComoPago); // rota para alterar status
router.get("/", auth, controller.listarPagamentosPorId);
router.get("/:id/parcelas", auth, controller.listarParcelasPorPagamento);
router.put("/parcelas/:id", auth, controller.atualizarParcelas);

export default router; 
