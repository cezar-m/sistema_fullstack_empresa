import db from "../config/db.js";

/* =========================
   CRIAR VENDA
========================= */
export const criarVenda = async (req, res) => {

	try {

		await db.query("BEGIN");

		const id_usuario = req.user.id;
		const { itens } = req.body;

		if(!itens || !Array.isArray(itens) || itens.length === 0){
			return res.status(400).json({ erro:"Itens obrigatórios" });
		}

		let total = 0;

		const vendaResult = await db.query(
			`INSERT INTO vendas (id_usuario, total, data_venda)
			VALUES ($1,0,NOW()) RETURNING id`,
			[id_usuario]
		);

		const id_venda = vendaResult.rows[0].id;

		for(const item of itens){

			const { nome, quantidade } = item;

			if(!nome || !quantidade || quantidade <= 0){
				await db.query("ROLLBACK");
				return res.status(400).json({ erro:"Produto e quantidade obrigatórios" });
			}

			const prodResult = await db.query(
				`SELECT p.id, p.nome, p.preco,
				COALESCE(e.quantidade,0) AS estoque
				FROM produtos p
				LEFT JOIN estoque e ON e.id_produto = p.id
				WHERE LOWER(TRIM(p.nome)) LIKE LOWER($1)
				LIMIT 1`,
				[`%${nome.trim()}%`]
			);

			if(prodResult.rows.length === 0){
				await db.query("ROLLBACK");
				return res.status(404).json({ erro:`Produto "${nome}" não encontrado` });
			}

			const produto = prodResult.rows[0];

			if(quantidade > produto.estoque){
				await db.query("ROLLBACK");
				return res.status(400).json({ erro:`Estoque insuficiente para ${produto.nome}` });
			}

			const subtotal = produto.preco * quantidade;
			total += subtotal;

			await db.query(
				`INSERT INTO itens_venda
				(id_venda, id_produto, quantidade, preco_unitario)
				VALUES ($1,$2,$3,$4)`,
				[id_venda, produto.id, quantidade, produto.preco]
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

		res.json({
			msg:"Venda realizada com sucesso",
			id_venda,
			total
		});

	}catch(err){

		await db.query("ROLLBACK");

		console.error(err);
		res.status(500).json({ erro:"Erro ao criar venda" });

	}
};


/* =========================
   LISTAR VENDAS (USUÁRIO)
========================= */
export const listarVendas = async (req, res) => {

	try{

		const id_usuario = req.user.id;

		const vendasResult = await db.query(`
			SELECT id,total,data_venda
			FROM vendas
			WHERE id_usuario = $1
			ORDER BY data_venda DESC
		`,[id_usuario]);

		const vendas = vendasResult.rows;

		for(const venda of vendas){

			const itensResult = await db.query(`
				SELECT 
					p.nome AS produto,
					iv.quantidade,
					iv.preco_unitario
				FROM itens_venda iv
				JOIN produtos p ON p.id = iv.id_produto
				WHERE iv.id_venda = $1
			`,[venda.id]);

			venda.itens = itensResult.rows;

		}

		res.json(vendas);

	}catch(err){

		console.error(err);
		res.status(500).json({ erro:"Erro ao listar vendas" });

	}

};
