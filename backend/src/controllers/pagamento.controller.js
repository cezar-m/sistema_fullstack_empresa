import db from "../config/db.js";

/* =========================
   CRIAR PAGAMENTO
========================= */
export const criarPagamento = async (req, res) => {
	const client = await db.connect();

	try {
		await client.query("BEGIN");

		const {
			id_venda,
			id_forma_pagamento,
			parcelas = [],
			status_pagamento
		} = req.body;

		if (!id_venda || !id_forma_pagamento) {
			throw new Error("Dados incompletos");
		}

		// 🔥 pega total da venda (CORRETO)
		const venda = await client.query(
			`SELECT total FROM vendas WHERE id = $1`,
			[id_venda]
		);

		if (venda.rows.length === 0) {
			throw new Error("Venda não encontrada");
		}

		const valor = Number(venda.rows[0].total);

		// 🔥 cria pagamento SEM criar venda
		const pagamento = await client.query(
			`INSERT INTO pagamentos
			 (id_venda, id_forma_pagamento, valor, status, data_pagamento)
			 VALUES ($1, $2, $3, $4, NOW())
			 RETURNING id`,
			[
				id_venda,
				id_forma_pagamento,
				valor,
				parcelas.length > 0 ? "pendente" : (status_pagamento || "pago")
			]
		);

		const id_pagamento = pagamento.rows[0].id;

		// parcelas
		if (parcelas.length > 0) {
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

		res.json({ sucesso: true });

	} catch (err) {
		await client.query("ROLLBACK");
		console.error(err);
		res.status(500).json({ erro: err.message });
	} finally {
		client.release();
	}
};

/* =========================
   LISTAR PAGAMENTOS
========================= */
export const listarPagamentosPorId = async (req, res) => {
	try {
		const result = await db.query(`
			SELECT
				p.id,
				p.valor,
				p.status,
				p.data_pagamento,
				v.id AS venda_id
			FROM pagamentos p
			JOIN vendas v ON v.id = p.id_venda
			WHERE v.id_usuario = $1
			ORDER BY p.id DESC
		`, [req.user.id]);

		res.json(result.rows);

	} catch (err) {
		res.status(500).json({ erro: err.message });
	}
};

/* =========================
   ATUALIZAR STATUS
========================= */
export const marcarComoPago = async (req, res) => {
	try {
		const { id } = req.params;

		await db.query(
			`UPDATE pagamentos SET status = 'pago' WHERE id = $1`,
			[id]
		);

		res.json({ sucesso: true });

	} catch (err) {
		res.status(500).json({ erro: err.message });
	}
};
