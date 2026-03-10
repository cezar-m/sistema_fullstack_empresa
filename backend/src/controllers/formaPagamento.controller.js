import db from "../config/db.js";

/* =========================
   CRIAR FORMA PAGAMENTO
========================= */

export const criarFormaPagamento = async (req, res) => {
	try {
		
		const { nome, ativo } = req.body;
		
		if(!nome) {
			return res.status(400).json({ erro: "Nome obrigatório" });
		}
		
		await db.query(
			"INSERT INTO formas_pagamento (nome, ativo) VALUES ($1, $2)",
			[nome, ativo ?? 1]
		);
		
		res.json({ msg: "Forma de pagamento criada" });
	
	} catch (err) {
		console.error(err);
		res.status(500).json({ erro: "Erro ao criar forma de pagamento" });
	}
};

/* =========================
   ATUALIZAR FORMA PAGAMENTO
========================= */
export const atualizarFormaPagamento = async (req, res) => {
	try {
		const { id } = req.params;
		const { nome, ativo } = req.body;
		
		if(!nome) {
			return res.status(400).json({ erro: "Nome obrigatório" });
		}
		
		await db.query(
			"UPDATE formas_pagamento SET nome = $1, ativo = $2 WHERE id = $3",
			[nome, ativo ?? 1, id]
		);
		
		res.json({ msg: "Forma de pagamento atualizada" });
	} catch (err) {
		console.error(err)
		res.status(500).json({ erro: "Erro ao atualizar forma de pagamento" });
	}
};

/* =========================
   EXCLUIR FORMA PAGAMENTO
========================= */
export const excluirFormaPagamento = async (req, res) => {
	try {
		const { id } = req.params;
		
		await db.query(
			"DELETE FROM formas_pagamento WHERE id = $1",
			[id]
		);
		
		res.json({ msg: "Forma de pagamento excluída" });
	
	} catch (err) {
		console.error(err);
		res.status(500).json({ erro: "Erro ao excluir forma de pagamento" });
	}
}

/* =========================
   LISTAR FORMAS
========================= */

export const listarFormas = async (req, res) => {
	const result = await db.query(
		"SELECT * FROM formas_pagamento"
	);
	res.json(result.rows);
};
