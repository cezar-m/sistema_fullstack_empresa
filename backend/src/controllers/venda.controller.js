import db from "../config/db.js";

/* =========================
   CRIAR VENDA
========================= */
export const criarVenda = async (req, res) => {
	try {
		await db.query("BEGIN");

		// 🔐 valida usuário
		if (!req.user || !req.user.id) {
			await db.query("ROLLBACK");
			return res.status(401).json({
				erro: "Usuário não autenticado"
			});
		}

		const id_usuario = req.user.id;
		const { itens } = req.body;

		// 🔒 valida itens
		if (!itens || !Array.isArray(itens) || itens.length === 0) {
			await db.query("ROLLBACK");
			return res.status(400).json({
				erro: "Itens obrigatórios"
			});
		}

		let total = 0;

		// cria venda
		const vendaResult = await db.query(
			`INSERT INTO vendas (id_usuario, total, data_venda)
			 VALUES ($1, 0, NOW())
			 RETURNING id`,
			[id_usuario]
		);

		const id_venda = vendaResult.rows[0].id;

		for (const item of itens) {

			let { nome, quantidade } = item;

			if (!nome || quantidade === undefined) {
				await db.query("ROLLBACK");
				return res.status(400).json({
					erro: "Produto e quantidade obrigatórios"
				});
			}

			nome = nome.trim();
			quantidade = Number(quantidade);

			if (isNaN(quantidade) || quantidade <= 0) {
				await db.query("ROLLBACK");
				return res.status(400).json({
					erro: `Quantidade inválida para ${nome}`
				});
			}

			// 🔍 busca produto (EXATO)
			const prodResult = await db.query(
				`SELECT id, nome, preco
				 FROM produtos
				 WHERE LOWER(TRIM(nome)) = LOWER($1)
				 LIMIT 1`,
				[nome]
			);

			if (prodResult.rows.length === 0) {
				await db.query("ROLLBACK");
				return res.status(404).json({
					erro: `Produto "${nome}" não encontrado`
				});
			}

			const produto = prodResult.rows[0];

			// 🔍 busca estoque
			const estoqueResult = await db.query(
				`SELECT quantidade 
				 FROM estoque 
				 WHERE id_produto = $1`,
				[produto.id]
			);

			if (estoqueResult.rows.length === 0) {
				await db.query("ROLLBACK");
				return res.status(400).json({
					erro: `Produto ${produto.nome} não possui estoque`
				});
			}

			const estoqueAtual = Number(estoqueResult.rows[0].quantidade);

			if (quantidade > estoqueAtual) {
				await db.query("ROLLBACK");
				return res.status(400).json({
					erro: `Estoque insuficiente para ${produto.nome}`
				});
			}

			const preco = Number(produto.preco);

			if (isNaN(preco)) {
				await db.query("ROLLBACK");
				return res.status(500).json({
					erro: `Preço inválido para ${produto.nome}`
				});
			}

			const subtotal = preco * quantidade;
			total += subtotal;

			// 💾 salva item
			await db.query(
				`INSERT INTO itens_venda
				 (id_venda, id_produto, quantidade, preco_unitario)
				 VALUES ($1, $2, $3, $4)`,
				[id_venda, produto.id, quantidade, preco]
			);

			// 🔻 baixa estoque com proteção
			const updateResult = await db.query(
				`UPDATE estoque
				 SET quantidade = quantidade - $1
				 WHERE id_produto = $2
				 AND quantidade >= $1`,
				[quantidade, produto.id]
			);

			// 🔥 proteção contra concorrência
			if (updateResult.rowCount === 0) {
				await db.query("ROLLBACK");
				return res.status(400).json({
					erro: `Erro ao atualizar estoque de ${produto.nome}`
				});
			}
		}

		// 💰 atualiza total
		await db.query(
			`UPDATE vendas SET total = $1 WHERE id = $2`,
			[total, id_venda]
		);

		await db.query("COMMIT");

		return res.status(201).json({
			msg: "Venda criada com sucesso",
			id_venda,
			total
		});

	} catch (err) {

		await db.query("ROLLBACK");

		console.error("ERRO CRIAR VENDA:", err);

		return res.status(500).json({
			erro: err.message,
			detalhe: err.detail
		});
	}
};


/* =========================
   LISTAR VENDAS
========================= */
export const listarVendas = async (req, res) => {
	try {

		if (!req.user || !req.user.id) {
			return res.status(401).json({
				erro: "Usuário não autenticado"
			});
		}

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
			erro: err.message,
			detalhe: err.detail
		});
	}
};
