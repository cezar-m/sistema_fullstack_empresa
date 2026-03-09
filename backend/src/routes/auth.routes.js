import { Router } from "express";
import * as controller from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", controller.register);
router.post("/login", controller.login);
router.post("/esqueci-senha", controller.esqueciSenha);
router.put("/redefinir-senha", controller.redefinirSenha);
router.post("/logout", controller.logout);

export default router;