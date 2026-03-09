import { Router } from "express";
import auth from "../middlewares/auth.js";
import * as controller from "../controllers/venda.controller.js";

const router = Router();

router.post("/", auth, controller.criarVenda);
router.get("/", auth, controller.listarVendas);

export default router;