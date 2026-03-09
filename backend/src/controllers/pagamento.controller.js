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
		const [produto] = await db.query(
			"SELECT id, nome, preco FROM produtos WHERE nome = ?",
			[nome_produto]
		);
		
		if(!produto.length) {
			return res.status(404).json({ erro: "Produto não encontrado" });
		}
		
		const id_produto = produto[0].id;
		const valor = produto[0].preco;
		
		// Buscar venda relacionada
		const [venda] = await db.query(
			`SELECT v.id
			 FROM vendas v
			 JOIN itens_venda iv ON iv .id_venda = v.id
			 WHERE iv.id_produto = ? AND v.id_usuario = ? 
			 ORDER BY id_venda DESC
			 LIMIT 1`,
			 [id_produto, req.user.id]
		);
		
		let id_venda;
		
		if(!venda.length) {
			const [novaVenda] = await db.query(
				`INSERT INTO vendas (id_usuario, data_venda) VALUES (?, NOW())`,
				[req.user.id]
			);
			id_venda = novaVenda.insertId;
			
			await db.query(
				`INSERT INTO itens_venda(id_venda, id_produto, quantidade) VALUES(?, ?, ?)`,
				[id_venda, id_produto, 1]
			);
		} else {
			id_venda = venda[0].id;
		}
		
		// Buscar forma de pagamento
		const [forma] = await db.query(
			"SELECT id FROM formas_pagamento WHERE nome = ? AND ativo = 1",
			[forma_pagamento]
		);
		
		if(!forma.length) {
			return res.status(404).json({ erro: "Forma de pagamento inválida" });
		}
		
		const id_forma_pagamento = forma[0].id;
		
		// Inserir pagamento com status enviando do front ou "pago" por padrão
		const [result] = await db.query(
			`INSERT INTO pagamentos
			   (id_venda, id_forma_pagamento, valor, status, data_pagamento)
			   VALUES(?, ?, ?, ?, NOW())`,
			   [id_venda, id_forma_pagamento, valor, status_pagamento || "pago"]
		);
		
		const id_pagamento = result.insertId;
		
		// Inserir parcelas
		if(parcelas && Array.isArray(parcelas) && parcelas.length > 0) {
			for(const p of parcelas) {
				await db.query(
					`INSERT INTO parcelas
					  (id_pagamento, numero_parcela, valor, data_vencimento, status)
					  VALUES (?, ?, ?, ?, ?)`,
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
		const [rows] = await db.query(`
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
			WHERE v.id_usuario = ?
			GROUP BY p.id
			ORDER BY p.id DESC
		`,[req.user.id]);
		
		res.json(rows);
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
			SET p.status = ?
			WHERE p.id = ? AND v.id_usuario = ?`
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
			`UPDATE parcelas SET status = ? WHERE id = ?`,
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

		const [rows] = await db.query(`
			SELECT 
				pa.id,
				pa.numero_parcela,
				pa.valor,
				pa.data_vencimento,
				pa.status
			FROM parcelas pa
			JOIN pagamentos p ON p.id = pa.id_pagamento
			JOIN vendas v ON v.id = p.id_venda
			WHERE pa.id_pagamento = ?
			AND v.id_usuario = ?
			ORDER BY pa.numero_parcela
		`, [id, req.user.id]);

		res.json(rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ erro: "Erro ao buscar parcelas" });
	}
};
