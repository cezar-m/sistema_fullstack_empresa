import db from "../config/db.js";

// =========================
// CRIAR PAGAMENTO
// =========================
export const criarPagamento = async (req, res) => {
	try {
		const { nome_produto, forma_pagamento, parcelas, status_pagamento } = req.body;
		
		if(!nome_produto || !forma_pagamento) {
			return res.status(400).json({ erro: "Dados incompletos" });
		}
		
		// Busca produto pelo nome
		const produtoResult = await db.query(
			"SELECT id, nome, preco FROM produtos WHERE nome = $1",
			[nome_produto]
		);

		const produto = produtoResult.rows;
		
		if(!produto.length) {
			return res.status(404).json({ erro: "Produto não encontrado" });
		}
		
		const id_produto = produto[0].id;
		const valor = produto[0].preco;
		
		// Buscar venda relacionada
		const vendaResult = await db.query(
			`SELECT v.id
			 FROM vendas v
			 JOIN itens_venda iv ON iv .id_venda = v.id
			 WHERE iv.id_produto = $1 AND v.id_usuario = $2 
			 ORDER BY id_venda DESC
			 LIMIT 1`,
			 [id_produto, req.user.id]
		);

		const venda = vendaResult.rows;
		
		let id_venda;
		
		if(!venda.length) {
			const novaVenda = await db.query(
				`INSERT INTO vendas (id_usuario, data_venda) VALUES ($1, NOW()) RETURNING id`,
				[req.user.id]
			);
			id_venda = novaVenda.rows[0].id;
			
			await db.query(
				`INSERT INTO itens_venda(id_venda, id_produto, quantidade) VALUES($1, $2, $3)`,
				[id_venda, id_produto, 1]
			);
		} else {
			id_venda = venda[0].id;
		}
		
		// Buscar forma de pagamento
		const formaResult = await db.query(
			"SELECT id FROM formas_pagamento WHERE nome = $1 AND ativo = 1",
			[forma_pagamento]
		);

		const forma = formaResult.rows;
		
		if(!forma.length) {
			return res.status(404).json({ erro: "Forma de pagamento inválida" });
		}
		
		const id_forma_pagamento = forma[0].id;
		
		// Inserir pagamento com status enviando do front ou "pago" por padrão
		const result = await db.query(
			`INSERT INTO pagamentos
			   (id_venda, id_forma_pagamento, valor, status, data_pagamento)
			   VALUES($1, $2, $3, $4, NOW()) RETURNING id`,
			   [id_venda, id_forma_pagamento, valor, status_pagamento || "pago"]
		);

		const id_pagamento = result.rows[0].id;
				
		// Inserir parcelas
		if(parcelas && Array.isArray(parcelas) && parcelas.length > 0) {
			for(const p of parcelas) {
				await db.query(
					`INSERT INTO parcelas
					  (id_pagamento, numero_parcela, valor, data_vencimento, status)
					  VALUES ($1, $2, $3, $4, $5)`,
					  [id_pagamento, p.numero, p.valor, p.data_vencimento, "pendente"]
				);
			}
		}
		
		res.json({ msg: "Pagamento criado com sucesso!!!", id_pagamento });
	} catch (err) {
		console.error(err);
		res.status(500).json({ erro: "Erro ao criar pagamento" });
	}
};

// =========================
// LISTAR PAGAMENTOS POR IDS
// =========================
export const listarPagamentosPorId = async (req, res) => {
	try {
		const result = await db.query(`
			SELECT
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
			WHERE v.id_usuario = $1
			GROUP BY p.id
			ORDER BY p.id DESC
		`,[req.user.id]);
		
		res.json(result.rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ erro: "Erro ao listar pagamentos" });
	}
};

// =========================
// ALTERAR STATUS PARA PAGO
// =========================
export const marcarComoPago = async (req, res) => {
	try {
		const { id } = req.params;
		
		if(!id) return res.status(400).json({ erro: "ID inválido" });
		
		await db.query(`
			UPDATE pagamentos p 
			JOIN vendas v ON v.id = p.id_venda
			SET p.status = $1
			WHERE p.id = $2 AND v.id_usuario = $3`
			, [req.body.status || "pago", id, req.user.id]);
		
		res.json({ msg: "Pagamento atualizado para pago!!!" });
	} catch(err) {
		console.error(err);
		res.status(500).json({ erro: "Erro ao atualizar pagamento" });
	}
};

// =========================
// ATUALIZAR PARCELA
// =========================
export const atualizarParcela = async (req, res) => {

	try {

		const { id } = req.params;
		const { status } = req.body;

		await db.query(
			`UPDATE parcelas SET status = $1 WHERE id = $2`,
			[status, id]
		);

		res.json({ msg: "Parcela atualizada com sucesso" });

	} catch(err) {

		console.error(err);
		res.status(500).json({ erro: "Erro ao atualizar parcela" });

	}

};


// =========================
// LISTAR PARCELAS POR PAGAMENTO
// =========================
export const listarParcelasPorPagamento = async (req, res) => {
	try {
		const { id } = req.params;

		const result = await db.query(`
			SELECT 
				pa.id,
				pa.numero_parcela,
				pa.valor,
				pa.data_vencimento,
				pa.status
			FROM parcelas pa
			JOIN pagamentos p ON p.id = pa.id_pagamento
			JOIN vendas v ON v.id = p.id_venda
			WHERE pa.id_pagamento = $1
			AND v.id_usuario = $2
			ORDER BY pa.numero_parcela
		`, [id, req.user.id]);

		res.json(result.rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ erro: "Erro ao buscar parcelas" });
	}
};
