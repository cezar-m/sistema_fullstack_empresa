import db from "../config/db.js";

/* =========================
   CRIAR VENDA
========================= */
export const criarVenda = async (req, res) => {
	let conn;
	
	try {
		conn = await db.getConnection();
		await conn.beginTransaction();
		
		const id_usuario = req.user.id;
		const { itens } = req.body;
		
		if(!itens || !Array.isArray(itens) || itens.length === 0) {
			return res.status(400).json({ erro: "Itens obrigatórios" });
		}
		
		let total = 0;
		
		const [vendaResult] = await conn.query(
			"INSERT INTO vendas (id_usuario, total, data_venda) VALUES (?, 0, NOW())",
			[id_usuario]
		);
		
		const id_venda = vendaResult.insertId;
		
		for(const item of itens) {
			const { nome, quantidade } = item;
			
			if(!nome || !quantidade || quantidade <= 0) {
				await conn.rollback();
				return res.status(400).json({ erro: "Produto e quantidade obrigatórios" });
			}
		
		
			// Busca parcial e ignorando maiúsculo
			const [prod] = await conn.query(
				`SELECT p.id, p.nome, p.preco,
					IFNULL(e.quantidade, 0) AS estoque
				FROM produtos p
				LEFT JOIN estoque e ON e.id_produto = p.id
				WHERE LOWER(TRIM(p.nome)) LIKE LOWER(?)
				LIMIT 1`,
				[`%${nome.trim()}%`]
			);
		
		
			if(prod.length ===0) {
				await conn.rollback();
				return res.status(404).json({ erro: `Produto "${nome}" não encontrado` });
			}
		
			const produto = prod[0];
		
			if(quantidade > produto.estoque) {
				await conn.rollback();
				return res.status(400).json({ erro: `Estoque insuficiente para ${produto.nome}` });
			}
		
			const subtotal = produto.preco * quantidade;
			total += subtotal;
		
			await conn.query(
				"INSERT INTO itens_venda (id_venda, id_produto, quantidade, preco_unitario) VALUES(?, ?, ?, ?)",
				[id_venda, produto.id, quantidade, produto.preco]
			);
		
			await conn.query(
				"UPDATE estoque SET quantidade = quantidade - ? WHERE id_produto = ?",
				[quantidade, produto.id]
			);
		}
		await conn.query(
			"UPDATE vendas SET total = ? WHERE id = ?",
			[total, id_venda]
		);

		await conn.commit();

		res.json({ msg: "Venda realizada com sucesso", id_venda, total});

	} catch(err) {
		if(conn) await conn.rollback();
		console.error(err);
		res.status(500).json({ erro: "Erro ao criar venda" });
	} finally {
		if(conn) conn.release();
	}
};

/* =========================
   LISTAR VENDAS (APENAS DO USUÁRIO)
========================= */
export const listarVendas = async (req, res) => {
	try {
		const id_usuario = req.user.id;
		
		const [vendas] = await db.query(`
			SELECT id, total, data_venda
			FROM vendas
			WHERE id_usuario = ?
			ORDER BY data_venda DESC
		`,[id_usuario]);
		
		for(const venda of vendas) {
			const [itens] = await db.query(`
				SELECT p.nome AS produto, iv.quantidade, iv.preco_unitario
				FROM itens_venda iv
				JOIN produtos p ON p.id = iv.id_produto
				WHERE iv.id_venda = ?
			`,[venda.id]);
			
			venda.itens = itens;
		}
		
		res.json(vendas);
		} catch (err) {
			console.error(err);
			res.status(500).json({ erro: "Erro ao listar vendas" });
		}
	
}