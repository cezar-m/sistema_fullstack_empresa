import db from "../config/db.js";

/* =========================
   CRIAR CATEGORIA
========================= */

export const criar = async (req, res) => {
	try {
		const { nome } = req.body;
		
		if(!nome)
			return res.status(400).json({ erro: "Nome obrigatório" });
		
		await db.query(
			"INSERT INTO categorias (nome) VALUES (?)",
			[nome]
		);
		
		res.json({ msg: "Categoria criada com sucesso" });
	
	} catch (err) {
		console.error(err);
		res.status(500).json({ erro: "Erro ao criar categoria" });
	} 
};

/* =========================
   LISTAR CATEGORIAS
========================= */

export const listar = async (req, res) => {
	try {
		const [rows] = await db.query(
			"SELECT * FROM categorias ORDER BY nome ASC"
		);
		
		res.json(rows);
	
	} catch (err) {
		console.error(err);
		res.status(500).json({ erro: "Erro ao listar categorias" });
	}
};

/* =========================
   ATUALIZAR CATEGORIA
========================= */

export const atualizar = async (req, res) => {
	try {
		const { id } = req.params;
		const { nome } = req.body;
		
		await db.query(
			"UPDATE categorias SET nome=? WHERE id=?",
			[nome, id]
		);
		
		res.json({ msg: "Categoria atualizada" });
	
	} catch(err) {
		console.error(err);
		res.status(500).json({ erro: "Erro ao atualizar categoria" });
	}
};

/* =========================
   DELETAR CATEGORIA
========================= */

export const deletar = async (req, res) => {
	try {
		const { id } = req.params;
		
		await db.query(
			"DELETE FROM categorias WHERE id=?",
			[id]
		);
		
		res.json({ msg: "Categoria deletada" });
	
	} catch (err) {
		console.error(err);
		res.status(500).json({ erro: "Erro ao deletar categoria" });
	}
};