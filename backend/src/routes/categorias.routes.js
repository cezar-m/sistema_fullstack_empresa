import { Router } from "express";
import auth from "../middlewares/auth.js";
import * as controller from "../controllers/categoria.controller.js";

const router = Router();

router.post("/", auth, controller.criar);
router.get("/", auth, controller.listar);
router.put("/:id", auth, controller.atualizar);
router.delete("/:id", auth, controller.deletar);

export default router;