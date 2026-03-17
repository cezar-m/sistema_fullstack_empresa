import { Router } from "express";
import * as controller from "../controllers/estoque.controller.js";
import auth from "../middlewares/auth.js";

const router = Router();

// Listar estoque
router.get("/", auth, controller.listarEstoque);

// Cadastrar estoque
router.post("/", auth, controller.cadastrarEstoque);

// Atualizar estoque pelo nome do produto
router.put("/:id_produto", auth, controller.atualizarEstoque);

// Deletar estoque pelo nome do produto
router.delete("/:id_produto", auth, controller.deletarEstoque);

export default router;
