import db from "../config/db.js";

/* =========================
   CRIAR PRODUTO
========================= */
export const criar = async (req, res) => {
	try {

		const { nome, preco, categoria, quantidade } = req.body;
		const imagem = req.file?.filename || null;
		const id_usuario = req.user.id;

		if(!nome || !categoria || !preco){
			return res.status(400).json({ erro: "Nome, preço e categoria são obrigatórios" });
		}

		const idCategoria = Number(categoria);

		const catResult = await db.query(
			"SELECT id FROM categorias WHERE id=$1",
			[idCategoria]
		);

		if(catResult.rows.length === 0){
			return res.status(400).json({ erro: "Categoria não encontrada" });
		}

		const result = await db.query(
			`INSERT INTO produtos
			(nome, preco, imagem, id_categoria, id_usuario)
			VALUES ($1,$2,$3,$4,$5) RETURNING id`,
			[nome, preco, imagem, idCategoria, id_usuario]
		);

		const id_produto = result.rows[0].id;

		await db.query(
			`INSERT INTO estoque (id_produto, quantidade)
			VALUES ($1,$2)`,
			[id_produto, quantidade || 0]
		);

		res.status(201).json({
			id: id_produto,
			nome,
			preco: Number(preco),
			categoria,
			quantidade: quantidade || 0,
			imagem
		});

	}catch(err){
		console.error("Erro criar produto:", err);
		res.status(500).json({ erro: "Erro ao criar produto" });
	}
};


/* =========================
   ATUALIZAR PRODUTO
========================= */
export const atualizar = async (req, res) => {
	try{

		const { id } = req.params;
		const { nome, preco, categoria, quantidade } = req.body;
		const imagem = req.file?.filename;

		if(!nome || !categoria || !preco){
			return res.status(400).json({ erro: "Nome, preço e categoria são obrigatórios" });
		}

		const catResult = await db.query(
			"SELECT id FROM categorias WHERE id=$1",
			[categoria]
		);

		if(catResult.rows.length === 0){
			return res.status(400).json({ erro: "Categoria não encontrada" });
		}

		const idCategoria = catResult.rows[0].id;

		let query = `UPDATE produtos SET nome=$1, preco=$2, id_categoria=$3`;
		let params = [nome, preco, idCategoria];
		let index = 4;

		if(imagem){
			query += `, imagem=$${index}`;
			params.push(imagem);
			index++;
		}

		query += ` WHERE id=$${index}`;
		params.push(id);

		await db.query(query, params);

		if(quantidade !== undefined){
			await db.query(
				`UPDATE estoque SET quantidade=$1 WHERE id_produto=$2`,
				[quantidade, id]
			);
		}

		res.json({
			id,
			nome,
			preco: Number(preco),
			categoria,
			quantidade: quantidade ?? null,
			imagem: imagem || null
		});

	}catch(err){
		console.error("Erro atualizar produto:", err);
		res.status(500).json({ erro: "Erro ao atualizar produto" });
	}
};


/* =========================
   DELETAR PRODUTO
========================= */
export const deletar = async (req, res) => {
	try{

		const { id } = req.params;

		await db.query("DELETE FROM estoque WHERE id_produto=$1",[id]);
		await db.query("DELETE FROM produtos WHERE id=$1",[id]);

		res.json({ msg:"Produto deletado com sucesso!!!" });

	}catch(err){
		console.error("Erro deletar produto:", err);
		res.status(500).json({ erro:"Erro ao deletar produto" });
	}
};


/* =========================
   LISTAR TODOS PRODUTOS
========================= */
export const listar = async (req, res) => {
	try{

		const result = await db.query(`
			SELECT
				p.id,
				p.nome,
				p.imagem,
				p.preco,
				p.id_categoria,
				COALESCE(e.quantidade,0) AS quantidade,
				COALESCE(c.nome,'Sem categoria') AS categoria,
				u.nome AS usuario
			FROM produtos p
			LEFT JOIN categorias c ON p.id_categoria = c.id
			LEFT JOIN usuarios u ON p.id_usuario = u.id
			LEFT JOIN estoque e ON p.id = e.id_produto
			ORDER BY p.nome ASC
		`);

		const produtos = result.rows.map(p => ({
			...p,
			preco: Number(p.preco)
		}));

		res.json(produtos);

	}catch(err){
		console.error("Erro ao listar produtos:", err);
		res.status(500).json({ erro:"Erro ao listar produtos" });
	}
};


/* =========================
   LISTAR PRODUTOS DO USUÁRIO LOGADO
========================= */
export const getProdutosUsuario = async (req, res) => {

	try{

		const userId = req.user.id;

		const result = await db.query(`
			SELECT 
				p.id,
				p.nome,
				p.imagem,
				p.preco,
				p.id_categoria,
				COALESCE(e.quantidade,0) AS quantidade,
				COALESCE(c.nome,'Sem categoria') AS categoria
			FROM produtos p
			LEFT JOIN categorias c ON p.id_categoria = c.id
			LEFT JOIN estoque e ON p.id = e.id_produto
			WHERE p.id_usuario = $1
			ORDER BY p.nome ASC
		`,[userId]);

		const produtos = result.rows.map(p => ({
			...p,
			preco: Number(p.preco)
		}));

		res.json(produtos);

	}catch(err){
		console.error("Erro getProdutosUsuario:", err);
		res.status(500).json({ erro:"Erro ao carregar produtos do usuário" });
	}
};
