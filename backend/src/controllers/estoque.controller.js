import db from "../config/db.js";

/* =========================
   CADASTRAR ESTOQUE
========================= */

export const cadastrarEstoque = async (req, res) => {
	try {

		// 🔐 valida usuário
		if (!req.user || !req.user.id) {
			return res.status(401).json({
				erro: "Usuário não autenticado"
			});
		}

		let { nome_produto, quantidade } = req.body;

		if (!nome_produto || quantidade === undefined) {
			return res.status(400).json({
				erro: "nome_produto e quantidade são obrigatórios"
			});
		}

		nome_produto = nome_produto.trim();
		quantidade = Number(quantidade);

		if (isNaN(quantidade)) {
			return res.status(400).json({
				erro: "Quantidade inválida"
			});
		}

		// 🔍 busca produto
		const prod = await db.query(
			`SELECT id FROM produtos WHERE LOWER(nome)=LOWER($1)`,
			[nome_produto]
		);

		let id_produto;

		if (prod.rows.length === 0) {

			// ⚠️ cria produto se não existir
			const result = await db.query(
				`INSERT INTO produtos
				(nome, preco, imagem, id_categoria, id_usuario)
				VALUES ($1,$2,$3,$4,$5)
				RETURNING id`,
				[
					nome_produto,
					0,
					"",
					1, // ⚠️ precisa existir no banco
					req.user.id
				]
			);

			id_produto = result.rows[0].id;

		} else {
			id_produto = prod.rows[0].id;
		}

		// 🔍 verifica estoque existente
		const estoque = await db.query(
			`SELECT * FROM estoque WHERE id_produto=$1`,
			[id_produto]
		);

		if (estoque.rows.length > 0) {
			return res.status(400).json({
				erro: "Estoque já existe para esse produto"
			});
		}

		// 💾 insere estoque
		await db.query(
			`INSERT INTO estoque (id_produto, quantidade)
			 VALUES ($1,$2)`,
			[id_produto, quantidade]
		);

		res.json({
			msg: "Estoque cadastrado com sucesso"
		});

	} catch (err) {

		console.error("ERRO ESTOQUE:", err);

		res.status(500).json({
			erro: err.message,
			detalhe: err.detail // 🔥 ajuda MUITO debug
		});
	}
};


/* =========================
   LISTAR ESTOQUE
========================= */

export const listarEstoque = async (req, res) => {
	try {

		const result = await db.query(
			`SELECT 
				e.id_produto,
				p.nome as produto,
				e.quantidade
			FROM estoque e
			LEFT JOIN produtos p
			ON p.id = e.id_produto
			ORDER BY p.nome`
		);

		res.json(result.rows);

	} catch (err) {

		console.error(err);

		res.status(500).json({
			erro: "Erro ao listar estoque"
		});
	}
};


/* =========================
   ATUALIZAR ESTOQUE
========================= */

export const atualizarEstoque = async (req, res) => {
	try {

		const { id_produto } = req.params;
		let { quantidade } = req.body;

		const id = Number(id_produto);
		quantidade = Number(quantidade);

		if (isNaN(id) || isNaN(quantidade)) {
			return res.status(400).json({
				erro: "Dados inválidos"
			});
		}

		const result = await db.query(
			`UPDATE estoque
			 SET quantidade=$1
			 WHERE id_produto=$2`,
			[quantidade, id]
		);

		if (result.rowCount === 0) {
			return res.status(404).json({
				erro: "Estoque não encontrado"
			});
		}

		res.json({
			msg: "Estoque atualizado"
		});

	} catch (err) {

		console.error(err);

		res.status(500).json({
			erro: err.message
		});
	}
};


/* =========================
   DELETAR ESTOQUE
========================= */

export const deletarEstoque = async (req, res) => {
	try {

		const { id_produto } = req.params;
		const id = Number(id_produto);

		if (isNaN(id)) {
			return res.status(400).json({
				erro: "ID inválido"
			});
		}

		const result = await db.query(
			`DELETE FROM estoque WHERE id_produto=$1`,
			[id]
		);

		if (result.rowCount === 0) {
			return res.status(404).json({
				erro: "Estoque não encontrado"
			});
		}

		res.json({
			msg: "Estoque removido"
		});

	} catch (err) {

		console.error(err);

		res.status(500).json({
			erro: err.message
		});
	}
};
