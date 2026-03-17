import db from "../config/db.js";

/* =========================
   CRIAR VENDA
========================= */
export const criarVenda = async (req, res) => {
	try {
		await db.query("BEGIN");

		const id_usuario = req.user.id;
		const { itens } = req.body;

		if (!itens || !Array.isArray(itens) || itens.length === 0) {
			await db.query("ROLLBACK");
			return res.status(400).json({ erro: "Itens obrigatórios" });
		}

		let total = 0;

		// ✅ CRIA VENDA (VOCÊ TINHA APAGADO ISSO)
		const vendaResult = await db.query(
			`INSERT INTO vendas (id_usuario, total, data_venda)
			 VALUES ($1, 0, NOW())
			 RETURNING id`,
			[id_usuario]
		);

		const id_venda = vendaResult.rows[0].id;

		/* =========================
		   LOOP DOS ITENS
		========================= */
		for (const item of itens) {
			const { nome, quantidade } = item;

			if (!nome || !quantidade || quantidade <= 0) {
				await db.query("ROLLBACK");
				return res.status(400).json({
					erro: "Produto e quantidade obrigatórios",
				});
			}

			// busca produto
			const prodResult = await db.query(
				`SELECT p.id, p.nome, p.preco,
				 COALESCE(e.quantidade, 0) AS estoque
				 FROM produtos p
				 LEFT JOIN estoque e ON e.id_produto = p.id
				 WHERE LOWER(TRIM(p.nome)) LIKE LOWER($1)
				 LIMIT 1`,
				[`%${nome.trim()}%`]
			);

			if (prodResult.rows.length === 0) {
				await db.query("ROLLBACK");
				return res.status(404).json({
					erro: `Produto "${nome}" não encontrado`,
				});
			}

			const produto = prodResult.rows[0];

			// ✅ GARANTE ESTOQUE (SEM ON CONFLICT)
			const estoqueCheck = await db.query(
				"SELECT * FROM estoque WHERE id_produto = $1",
				[produto.id]
			);

			if (estoqueCheck.rows.length === 0) {
				await db.query(
					"INSERT INTO estoque (id_produto, quantidade) VALUES ($1, 0)",
					[produto.id]
				);
			}

			// pega estoque atualizado
			const estoqueAtualResult = await db.query(
				"SELECT quantidade FROM estoque WHERE id_produto = $1",
				[produto.id]
			);

			const estoqueAtual = estoqueAtualResult.rows[0].quantidade;

			if (quantidade > estoqueAtual) {
				await db.query("ROLLBACK");
				return res.status(400).json({
					erro: `Estoque insuficiente para ${produto.nome}`,
				});
			}

			const subtotal = Number(produto.preco) * quantidade;
			total += subtotal;

			// salva item
			await db.query(
				`INSERT INTO itens_venda
				 (id_venda, id_produto, quantidade, preco_unitario)
				 VALUES ($1, $2, $3, $4)`,
				[id_venda, produto.id, quantidade, produto.preco]
			);

			// baixa estoque
			await db.query(
				`UPDATE estoque
				 SET quantidade = quantidade - $1
				 WHERE id_produto = $2`,
				[quantidade, produto.id]
			);
		}

		// atualiza total
		await db.query(
			`UPDATE vendas SET total = $1 WHERE id = $2`,
			[total, id_venda]
		);

		await db.query("COMMIT");

		return res.status(201).json({
			msg: "Venda realizada com sucesso",
			id_venda,
			total,
		});
	} catch (err) {
		await db.query("ROLLBACK");
		console.error("ERRO CRIAR VENDA:", err);

		return res.status(500).json({
			erro: "Erro ao criar venda",
			detalhe: err.message,
		});
	}
};
