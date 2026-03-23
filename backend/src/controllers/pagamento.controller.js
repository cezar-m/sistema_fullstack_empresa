import db from "../config/db.js";

/* =========================
   CRIAR PAGAMENTO
========================= */
export const criarPagamento = async (req, res) => {
	let client;

	try {
		client = await db.connect();
		await client.query("BEGIN");

		const {
			id_venda,
			id_forma_pagamento,
			parcelas = [],
			status_pagamento
		} = req.body;

		// ✅ VALIDAÇÃO CORRETA
		if (!id_venda || !id_forma_pagamento) {
			return res.status(400).json({ erro: "Dados incompletos" });
		}

		// 🔥 busca venda
		const vendaResult = await client.query(
			`SELECT total FROM vendas WHERE id = $1`,
			[Number(id_venda)]
		);

		if (vendaResult.rows.length === 0) {
			return res.status(404).json({ erro: "Venda não encontrada" });
		}

		const valor = Number(vendaResult.rows[0].total);

		// 🔥 cria pagamento
		const pagamentoResult = await client.query(
			`INSERT INTO pagamentos
			 (id_venda, id_forma_pagamento, valor, status, data_pagamento)
			 VALUES ($1, $2, $3, $4, NOW())
			 RETURNING id`,
			[
				Number(id_venda),
				Number(id_forma_pagamento),
				valor,
				parcelas.length > 0 ? "pendente" : (status_pagamento || "pago")
			]
		);

		const id_pagamento = pagamentoResult.rows[0].id;

		// 🔥 cria parcelas
		if (Array.isArray(parcelas) && parcelas.length > 0) {
			for (const p of parcelas) {
				await client.query(
					`INSERT INTO parcelas
					 (id_pagamento, numero_parcela, valor, data_vencimento, status)
					 VALUES ($1, $2, $3, $4, $5)`,
					[
						id_pagamento,
						p.numero,
						p.valor,
						p.data_vencimento,
						"pendente"
					]
				);
			}
		}

		await client.query("COMMIT");

		return res.json({ sucesso: true });

	} catch (err) {
		if (client) await client.query("ROLLBACK");

		console.error("ERRO CRIAR PAGAMENTO:", err);

		return res.status(500).json({
			erro: "Erro interno ao criar pagamento"
		});

	} finally {
		if (client) client.release();
	}
};

/* =========================
   LISTAR PAGAMENTOS
========================= */
export const listarPagamentosPorId = async (req, res) => {
	try {
		const result = await db.query(
			`SELECT
				p.id,
				p.valor,
				p.status,
				p.data_pagamento,
				v.id AS venda_id
			FROM pagamentos p
			JOIN vendas v ON v.id = p.id_venda
			WHERE v.id_usuario = $1
			ORDER BY p.id DESC`,
			[req.user.id]
		);

		return res.json(result.rows);

	} catch (err) {
		console.error("ERRO LISTAR PAGAMENTOS:", err);

		return res.status(500).json({
			erro: "Erro ao listar pagamentos"
		});
	}
};

/* =========================
   MARCAR COMO PAGO
========================= */
export const marcarComoPago = async (req, res) => {
	try {
		const { id } = req.params;

		if (!id) {
			return res.status(400).json({ erro: "ID inválido" });
		}

		await db.query(
			`UPDATE pagamentos SET status = 'pago' WHERE id = $1`,
			[Number(id)]
		);

		return res.json({ sucesso: true });

	} catch (err) {
		console.error("ERRO PAGAR:", err);

		return res.status(500).json({
			erro: "Erro ao atualizar pagamento"
		});
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
				id,
				numero_parcela,
				valor,
				data_vencimento,
				status
			 FROM parcelas
			 WHERE id_pagamento = $1
			 ORDER BY numero_parcela`,
			[Number(id)]
		);

		return res.json(result.rows);

	} catch (err) {
		console.error("ERRO PARCELAS:", err);

		return res.status(500).json({
			erro: "Erro ao buscar parcelas"
		});
	}
};

/* =========================
   ATUALIZAR PARCELA
========================= */
export const atualizarParcela = async (req, res) => {
	try {
		const { id } = req.params;
		const { status } = req.body;

		if (!id || !status) {
			return res.status(400).json({ erro: "Dados inválidos" });
		}

		await db.query(
			`UPDATE parcelas SET status = $1 WHERE id = $2`,
			[status, Number(id)]
		);

		return res.json({ sucesso: true });

	} catch (err) {
		console.error("ERRO UPDATE PARCELA:", err);

		return res.status(500).json({
			erro: "Erro ao atualizar parcela"
		});
	}
};
