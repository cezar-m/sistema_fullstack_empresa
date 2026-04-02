import { Router } from "express";
import auth from "../middlewares/auth.js";
import upload from "../middlewares/upload.js";
import validateProduct from "../middlewares/validateProduct.js";
import * as controller from "../controllers/product.controller.js";

const router = Router();

// Criar produto
router.post("/", auth, upload.single("imagem"), controller.criar);

// Atualizar produto
router.put("/:id", auth, upload.single("imagem"), validateProduct, controller.atualizar);

// Deletar produto
router.delete("/:id", auth, controller.deletar);

// Lista produtos do usuário logado
router.get("/", auth, controller.listar);

export default router;
