import db from "../config/db.js";

/* =========================
   CRIAR PRODUTO
========================= */
export const criar = async (req, res) => {
	try {
		const { nome, preco, categoria, quantidade  } = req.body;
		const imagem= req.file?.filename || null;
		const id_usuario = req.user.id;
		
		if(!nome || !categoria || !preco) {
			return res.status(400).json({ erro: "Nome, preço e categoria são obrigatórios" });
		}
		
		// Busca pelo id da categoria pelo nome
		const idCategoria = Number(categoria);
		
		const [cat] = await db.query("SELECT id FROM categorias WHERE id=?", [idCategoria]);
		if(cat.length ===0) return res.status(400).json({ erro: "Categoria não encontrada" });
		
		// Insere o produto
		const [result] = await db.query(
			`INSERT INTO produtos(nome, preco, imagem, id_categoria, id_usuario) VALUES(?,?,?,?,?)`,
			[nome, preco, imagem, idCategoria, id_usuario]
		);
		
		// Insere no estoque
		await db.query(
			`INSERT INTO estoque(id_produto, quantidade) VALUES(?,?)`,
			[result.insertId, quantidade || 0]
		);
		
		res.status(201).json({
			id: result.insertId,
			nome,
			preco: Number(preco),
			categoria,
			quantidade: quantidade || 0,
			imagem,
		});
	
	} catch (err) {
		console.error("Erro criar produto:", err);
		res.status(500).json({ erro: "Erro ao criar produto" });
	}
};

/* =========================
   ATUALIZAR PRODUTO
========================= */
export const atualizar = async (req, res) => {
	try {
		const { id } = req.params;
		const { nome, preco, categoria, quantidade } = req.body;
		const imagem = req.file?.filename;
		
		if(!nome || !categoria || !preco) {
			return res.status(400).json({ erro: "Nome, preço e categoria são obrigatórios" });
		}
		
		const [cat] = await db.query("SELECT id FROM categorias WHERE id=?", [categoria]);
		if(cat.length === 0) return res.status(400).json({ erro: "Categoria não encontrada" });
		const idCategoria = cat[0].id;
		
		let query = `UPDATE produtos SET nome=?, preco=?, id_categoria=?`;
		const params = [nome, preco, idCategoria];
		
		if(imagem) {
			query += ", imagem=?";
			params.push(imagem);
		} 
		
		query += " WHERE id=?";
		params.push(id);
		
		await db.query(query, params);
		
		// Atualiza estoque
		if(quantidade !== undefined) {
			await db.query(
				`UPDATE estoque SET quantidade=? WHERE id_produto=?`,
				[quantidade, id]
			);
		}
		
		res.json({
			id,
			nome,
			preco: Number(preco),
			categoria,
			quantidade: quantidade !== undefined ? quantidade : null,
			imagem: imagem || null,
		});
	
	} catch(err) {
		console.error("Erro atualizar produto:", err);
		res.status(500).json({ erro: "Erro ao atualizar produto" });
	}	
};

/* =========================
   DELETAR PRODUTO
========================= */
export const deletar = async (req, res) => {
	try {
		const { id } = req.params;
		await db.query("DELETE FROM estoque WHERE id_produto=?", [id]);
		await db.query("DELETE FROM produtos WHERE id=?", [id]);
		
		res.json({ msg: "Produto deletado com sucesso!!!" });
	} catch(err) {
		console.error("Erro deletar produto:", err);
		res.status(500).json({ erro: "Erro ao deletar produto" });
	}
};

/* =========================
   LISTAR TODOS PRODUTOS
========================= */
export const listar = async (req, res) => {
	try {
		const [rows] = await db.query(`
			SELECT
				p.id,
				p.nome,
				p.imagem,
				p.preco,
				p.id_categoria,
				COALESCE(e.quantidade,0) AS quantidade,
				COALESCE(c.nome, 'Sem categoria') AS categoria,
				u.nome AS usuario
			FROM produtos p
			LEFT JOIN categorias c ON p.id_categoria = c.id
			LEFT JOIN usuarios u ON p.id_usuario = u.id
			LEFT JOIN estoque e ON p.id = e.id_produto
			ORDER BY p.nome ASC
		`);
		
		const produtosFormatados = rows.map(p => ({ ...p, preco: Number(p.preco) }));
		
		res.json(produtosFormatados);
	} catch(err) {
		console.error("Erro ao listar produtos:", err);
		res.status(500).json({ erro: "Erro ao listar produtos" });
	}
};

/* =========================
   LISTAR PRODUTOS DO USUÁRIO LOGADO
========================= */
export const getProdutosUsuario = async (req, res) => {
	const userId = req.user.id;
	try {
		const [rows] = await db.query(`
			SELECT 
				p.id, p.nome, p.imagem, p.preco, p.id_categoria,
				COALESCE(e.quantidade, 0) AS quantidade,
				COALESCE(c.nome, 'Sem categoria') AS categoria
			FROM produtos p
			LEFT JOIN categorias c ON p.id_categoria = c.id
			LEFT JOIN estoque e ON p.id = e.id_produto
			WHERE p.id_usuario = ?
			ORDER BY p.nome ASC
		`, [userId]);
		
		const produtosFormatados = rows.map(p=> ({ ...p, preco: Number(p.preco) }));
		
		res.json(produtosFormatados);
	} catch(err) {
		console.error("Erro getProdutosUsuario:", err);
		res.status(500).json({ erro: "Erro ao carregar produtos do usuario" });
	}
};