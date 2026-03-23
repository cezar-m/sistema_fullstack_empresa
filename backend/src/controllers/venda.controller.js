import db from "../config/db.js";

/* =========================
   CRIAR VENDA
========================= */
export const criarVenda = async (req, res) => {
	try {
		await db.query("BEGIN");

		if (!req.user || !req.user.id) {
			await db.query("ROLLBACK");
			return res.status(401).json({ erro: "Usuário não autenticado" });
		}

		const id_usuario = req.user.id;
		const { itens } = req.body;

		if (!itens || !Array.isArray(itens) || itens.length === 0) {
			await db.query("ROLLBACK");
			return res.status(400).json({ erro: "Itens obrigatórios" });
		}

		let total = 0;

		const vendaResult = await db.query(
			`INSERT INTO vendas (id_usuario, total, data_venda)
			 VALUES ($1, 0, NOW())
			 RETURNING id`,
			[id_usuario]
		);

		const id_venda = vendaResult.rows[0].id;

		for (const item of itens) {
			let { nome, quantidade } = item;

			nome = nome.trim();
			quantidade = Number(quantidade);

			const prod = await db.query(
				`SELECT id, preco FROM produtos
				 WHERE LOWER(TRIM(nome)) = LOWER($1)
				 LIMIT 1`,
				[nome]
			);

			if (prod.rows.length === 0) {
				throw new Error(`Produto ${nome} não encontrado`);
			}

			const produto = prod.rows[0];

			const estoque = await db.query(
				`SELECT quantidade FROM estoque WHERE id_produto = $1`,
				[produto.id]
			);

			if (estoque.rows.length === 0) {
				throw new Error(`Produto sem estoque`);
			}

			const estoqueAtual = Number(estoque.rows[0].quantidade);

			if (quantidade > estoqueAtual) {
				throw new Error(`Estoque insuficiente`);
			}

			const preco = Number(produto.preco);
			const subtotal = preco * quantidade;
			total += subtotal;

			await db.query(
				`INSERT INTO itens_venda
				 (id_venda, id_produto, quantidade, preco_unitario)
				 VALUES ($1, $2, $3, $4)`,
				[id_venda, produto.id, quantidade, preco]
			);

			await db.query(
				`UPDATE estoque
				 SET quantidade = quantidade - $1
				 WHERE id_produto = $2`,
				[quantidade, produto.id]
			);
		}

		await db.query(
			`UPDATE vendas SET total = $1 WHERE id = $2`,
			[total, id_venda]
		);

		await db.query("COMMIT");

		return res.json({
			sucesso: true,
			id_venda,
			total
		});

	} catch (err) {
		await db.query("ROLLBACK");
		console.error(err);
		res.status(500).json({ erro: err.message });
	}
};

/* =========================
   LISTAR VENDAS
========================= */
export const listarVendas = async (req, res) => {
	try {
		const result = await db.query(
			`SELECT * FROM vendas
			 WHERE id_usuario = $1
			 ORDER BY id DESC`,
			[req.user.id]
		);

		res.json(result.rows);

	} catch (err) {
		res.status(500).json({ erro: err.message });
	}
};
