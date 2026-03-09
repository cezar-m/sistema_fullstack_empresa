import { Router } from "express";
import auth from "../middlewares/auth.js";
import * as controller from "../controllers/formaPagamento.controller.js";

const router = Router();

router.post("/", auth, controller.criarFormaPagamento);
router.put("/:id", auth, controller.atualizarFormaPagamento);
router.delete("/:id", auth, controller.excluirFormaPagamento)
router.get("/", auth, controller.listarFormas);

export default router;