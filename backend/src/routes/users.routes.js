import { Router } from "express";
import auth from "../middlewares/auth.js";
import admin from "../middlewares/admin.js";
import * as controller from "../controllers/user.controller.js";

const router = Router();

// somente admin vê usuários
router.get("/", auth, admin, controller.listar);

// somente admin deleta usuários
router.delete("/:id", auth, admin, controller.deletar);

export default router;