import db from "../config/db.js";

/* =========================
   CADASTRAR ESTOQUE
========================= */
export const cadastrarEstoque = async (req, res) => {
	try {
		let { nome_produto, quantidade } = req.body;
		
		if(!nome_produto || quantidade == undefined) {
			return res
				.status(400)
				.json({ erro: "nome do produto e quantidade são obrigatórios" });
		}
		
		nome_produto = nome_produto.trim();
		if(!nome_produto) {
			return res.status(400).json({ erro: "Nome do produto não pode ser vazio" });
		}
		
		// Busca o produto pelo nome
		const prodResult = await db.query(
			"SELECT id FROM produtos WHERE LOWER(nome) = LOWER($1)",
			[nome_produto]
		);
		const prod = prodResult.rows;
		
		let id_produto;
		
		if(prod.length === 0) {
			// Cria produto se não existir
			const result = await db.query(
				"INSERT INTO produtos (nome) VALUES ($1) RETURNING id",
				[nome_produto]
			);
			id_produto = result.rows[0].id;
		} else {
			id_produto = prod[0].id;
		}
		
		// Verifica se já existe ESTOQUE
		const existsResult  = await db.query(
			"SELECT * FROM estoque WHERE id_produto=$1",
			[id_produto]
		);
		const exists = existsResult.rows;
		
		if(exists.length > 0) {
			return res.status(400).json({ erro: "Estoque já existe para este produto" });
		}
		
		await db.query(
			"INSERT INTO estoque (id_produto, quantidade) VALUES ($1, $2)",
			[id_produto, quantidade]
		);
		
		res.json({ msg: `Estoque do produto "${nome_produto}" cadastrado com sucesso!!!` });
	} catch(err) {
		console.error(err);
		res.status(500).json({ erro: "Erro ao cadastrar estoque" });
	}
}

/* =========================
   ATUALIZAR ESTOQUE PELO ID PRODUTO
========================= */
export const atualizarEstoque = async (req, res) => {
	try{
		let { id_produto, nome_produto, quantidade } = req.body;
		
		if(!id_produto || !nome_produto || quantidade == undefined) {
			return res
				.status(400)
				.json({ erro: "id, nome do produto e quantidade são obrigatórios" });
		}
		
		nome_produto = nome_produto.trim();
		if(!nome_produto) {
			return res.status(400).json({ erro: "Nome do produto não pode ser vazio" });
		}
		
		// Atualiza nome do produto (caso tenha mudado)
		await db.query("UPDATE produtos SET nome=$1 WHERE id=$2", [nome_produto, id_produto]);
		
		// Verifica se já existe estoque
		const existsResult = await db.query(
			"SELECT * FROM estoque WHERE id_produto=$1",
			[id_produto]
		);

		const exists = existsResult.rows;
		
		if(exists.length === 0) {
			// Insere estoque se não existir
			await db.query(
				"INSERT INTO estoque (id_produto, quantidade) VALUES ($1, $2)",
				[id_produto, quantidade]
			);
		} else {
			// Atualiza quantidade
			await db.query(
				"UPDATE estoque SET quantidade=$1 WHERE id_produto=$2",
				[quantidade, id_produto]
			);
		}
		
		res.json({ msg: `Estoque do produto "${nome_produto}" atualizado com sucesso!!!` });
		
	} catch (err) {
		console.error(err);
		res.status(500).json({ erro: "Erro ao atualizar o estoque" });
		
	}
};

/* =========================
   DELETAR ESTOQUE PELO ID PRODUTO
========================= */
export const deletarEstoque = async (req, res) => {
	try {
		let { id_produto } = req.body;
		
		if(!id_produto) {
			return res.status(400).json({ erro: "id_produto é obrigatório" });
		}
		
		// Remove estoque
		await db.query("DELETE FROM estoque WHERE id_produto=$1", [id_produto]);
		
		res.json({ msg: `Estoque do produto deletado com sucesso!!!` });
	} catch(err) {
		console.error(err);
		res.status(500).json({ erro: "Erro ao deletar estoque" });
	}
};

/* =========================
   LISTAR ESTOQUE
========================= */
export const listarEstoque = async (req, res) => {
	try {
		const result = await db.query(
			`SELECT e.id_produto, p.nome AS produto, e.quantidade
			FROM estoque e
			LEFT JOIN produtos p ON e.id_produto = p.id
			ORDER BY p.nome ASC`
		);
		res.json(result.rows);
	} catch(err) {
	res.status(500).json({ erro: "Erro ao listar estoque"});
	}
};
