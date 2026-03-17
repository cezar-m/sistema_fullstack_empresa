import db from "../config/db.js";

/* =========================
   CRIAR PAGAMENTO
========================= */
export const criarPagamento = async (req, res) => {
	try {
		console.log("BODY:", req.body);
		console.log("USER:", req.user);

		if (!req.user || !req.user.id) {
			return res.status(401).json({ erro: "Usuário não autenticado" });
		}

		const {
			id_produto,
			forma_pagamento,
			parcelas,
			quantidade
		} = req.body;

		if (!id_produto || !forma_pagamento) {
			return res.status(400).json({
				erro: "id_produto e forma_pagamento são obrigatórios"
			});
		}

		const qtd = Number(quantidade) || 1;

		/* =========================
		   PRODUTO
		========================= */
		const produtoResult = await db.query(
			"SELECT id, nome, preco FROM produtos WHERE id=$1",
			[id_produto]
		);

		if (!produtoResult.rows.length) {
			return res.status(404).json({ erro: "Produto não encontrado" });
		}

		const produto = produtoResult.rows[0];
		const valorTotal = Number(produto.preco) * qtd;

		/* =========================
		   ESTOQUE (VALIDAÇÃO)
		========================= */
		const estoqueResult = await db.query(
			"SELECT quantidade FROM estoque WHERE id_produto=$1",
			[id_produto]
		);

		if (!estoqueResult.rows.length) {
			return res.status(400).json({
				erro: "Produto sem estoque cadastrado"
			});
		}

		const estoqueAtual = Number(estoqueResult.rows[0].quantidade);

		if (estoqueAtual < qtd) {
			return res.status(400).json({
				erro: "Estoque insuficiente"
			});
		}

		/* =========================
		   VENDA
		========================= */
		const venda = await db.query(
			`INSERT INTO vendas (id_usuario, data_venda)
			 VALUES ($1, NOW())
			 RETURNING id`,
			[req.user.id]
		);

		const id_venda = venda.rows[0].id;

		await db.query(
			`INSERT INTO itens_venda (id_venda, id_produto, quantidade)
			 VALUES ($1,$2,$3)`,
			[id_venda, id_produto, qtd]
		);

		/* =========================
		   FORMA PAGAMENTO
		========================= */
		const formaResult = await db.query(
			"SELECT id FROM formas_pagamento WHERE nome=$1 AND ativo=true",
			[forma_pagamento]
		);

		if (!formaResult.rows.length) {
			return res.status(400).json({
				erro: "Forma de pagamento inválida"
			});
		}

		const id_forma_pagamento = formaResult.rows[0].id;

		/* =========================
		   PAGAMENTO
		========================= */
		const pagamentoResult = await db.query(
			`INSERT INTO pagamentos
			 (id_venda, id_forma_pagamento, valor, status, data_pagamento)
			 VALUES ($1,$2,$3,$4,NOW())
			 RETURNING id`,
			[id_venda, id_forma_pagamento, valorTotal, "pago"]
		);

		const id_pagamento = pagamentoResult.rows[0].id;

		/* =========================
		   PARCELAS
		========================= */
		if (Array.isArray(parcelas) && parcelas.length > 0) {
			for (const p of parcelas) {
				await db.query(
					`INSERT INTO parcelas
					 (id_pagamento, numero_parcela, valor, data_vencimento, status)
					 VALUES ($1,$2,$3,$4,$5)`,
					[
						id_pagamento,
						p.numero,
						p.valor,
						p.data_vencimento,
						p.status || "pendente",
					]
				);
			}
		}

		/* =========================
		   BAIXAR ESTOQUE
		========================= */
		await db.query(
			`UPDATE estoque
			 SET quantidade = quantidade - $1
			 WHERE id_produto=$2`,
			[qtd, id_produto]
		);

		res.json({
			msg: "Pagamento criado com sucesso",
			id_pagamento
		});

	} catch (err) {
		console.error("ERRO REAL:", err);
		res.status(500).json({
			erro: err.message
		});
	}
};


/* =========================
   LISTAR PAGAMENTOS
========================= */
export const listarPagamentosPorId = async (req, res) => {
	try {
		if (!req.user || !req.user.id) {
			return res.status(401).json({ erro: "Não autenticado" });
		}

		const result = await db.query(
			`SELECT
				p.id,
				pr.nome AS nome_produto,
				f.nome AS forma_pagamento,
				p.valor,
				p.status,
				p.data_pagamento
			 FROM pagamentos p
			 JOIN vendas v ON v.id = p.id_venda
			 JOIN itens_venda iv ON iv.id_venda = v.id
			 JOIN produtos pr ON pr.id = iv.id_produto
			 JOIN formas_pagamento f ON f.id = p.id_forma_pagamento
			 WHERE v.id_usuario=$1
			 GROUP BY p.id, pr.nome, f.nome
			 ORDER BY p.id DESC`,
			[req.user.id]
		);

		res.json(result.rows);

	} catch (err) {
		console.error(err);
		res.status(500).json({ erro: err.message });
	}
};


/* =========================
   MARCAR COMO PAGO
========================= */
export const marcarComoPago = async (req, res) => {
	try {
		const { id } = req.params;

		await db.query(
			`UPDATE pagamentos
			 SET status=$1
			 FROM vendas
			 WHERE pagamentos.id_venda = vendas.id
			 AND pagamentos.id=$2
			 AND vendas.id_usuario=$3`,
			[req.body.status || "pago", id, req.user.id]
		);

		res.json({ msg: "Pagamento atualizado" });

	} catch (err) {
		console.error(err);
		res.status(500).json({ erro: err.message });
	}
};


/* =========================
   ATUALIZAR PARCELA
========================= */
export const atualizarParcela = async (req, res) => {
	try {
		const { id } = req.params;
		const { status } = req.body;

		await db.query(
			`UPDATE parcelas SET status=$1 WHERE id=$2`,
			[status, id]
		);

		res.json({ msg: "Parcela atualizada" });

	} catch (err) {
		console.error(err);
		res.status(500).json({ erro: err.message });
	}
};


/* =========================
   LISTAR PARCELAS
========================= */
export const listarParcelasPorPagamento = async (req, res) => {
	try {
		const { id } = req.params;

		const result = await db.query(
			`SELECT
				pa.id,
				pa.numero_parcela,
				pa.valor,
				pa.data_vencimento,
				pa.status
			 FROM parcelas pa
			 JOIN pagamentos p ON p.id = pa.id_pagamento
			 JOIN vendas v ON v.id = p.id_venda
			 WHERE pa.id_pagamento=$1
			 AND v.id_usuario=$2
			 ORDER BY pa.numero_parcela`,
			[id, req.user.id]
		);

		res.json(result.rows);

	} catch (err) {
		console.error(err);
		res.status(500).json({ erro: err.message });
	}
};
