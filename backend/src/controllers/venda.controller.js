import db from "../config/db.js";

/* =========================
   CRIAR VENDA
========================= */
export const criarVenda = async (req, res) => {
	try {
		await db.query("BEGIN");

		const id_usuario = req.user.id;
		const { itens } = req.body;

		// 🔒 validação forte
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
			const { nome, quantidade } = item;

			// 🔒 validação item
			if (!nome || !quantidade || quantidade <= 0) {
				await db.query("ROLLBACK");
				return res.status(400).json({
					erro: "Produto e quantidade obrigatórios",
				});
			}

			// busca produto
			const prodResult = await db.query(
				`SELECT id, nome, preco
				 FROM produtos
				 WHERE LOWER(TRIM(nome)) LIKE LOWER($1)
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

			// 🔒 garante estoque
			const estoqueResult = await db.query(
				"SELECT quantidade FROM estoque WHERE id_produto = $1",
				[produto.id]
			);

			let estoqueAtual = 0;

			if (estoqueResult.rows.length === 0) {
				// cria estoque zerado
				await db.query(
					"INSERT INTO estoque (id_produto, quantidade) VALUES ($1, 0)",
					[produto.id]
				);
			} else {
				estoqueAtual = estoqueResult.rows[0].quantidade;
			}

			// 🔒 valida estoque
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
			"UPDATE vendas SET total = $1 WHERE id = $2",
			[total, id_venda]
		);

		await db.query("COMMIT");

		return res.status(201).json({
			msg: "Venda criada com sucesso",
			id_venda,
			total,
		});
	} catch (err) {
		await db.query("ROLLBACK");
		console.error("ERRO CRIAR VENDA:", err);

		return res.status(500).json({
			erro: "Erro interno do servidor",
			detalhe: err.message,
		});
	}
};

/* =========================
   LISTAR VENDAS
========================= */
export const listarVendas = async (req, res) => {
	try {
		const id_usuario = req.user.id;

		const result = await db.query(
			`SELECT 
				v.id,
				v.total,
				v.data_venda,
				COALESCE(
					json_agg(
						json_build_object(
							'produto', p.nome,
							'quantidade', iv.quantidade
						)
					) FILTER (WHERE iv.id IS NOT NULL),
					'[]'
				) AS itens
			FROM vendas v
			LEFT JOIN itens_venda iv ON iv.id_venda = v.id
			LEFT JOIN produtos p ON p.id = iv.id_produto
			WHERE v.id_usuario = $1
			GROUP BY v.id
			ORDER BY v.data_venda DESC`,
			[id_usuario]
		);

		return res.json(result.rows);
	} catch (err) {
		console.error("ERRO LISTAR VENDAS:", err);

		return res.status(500).json({
			erro: "Erro ao listar vendas",
			detalhe: err.message,
		});
	}
};
