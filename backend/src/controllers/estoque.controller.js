import db from "../config/db.js";

/* =========================
   CADASTRAR ESTOQUE
========================= */
export const cadastrarEstoque = async (req, res) => {

	try {

		let { nome_produto, quantidade } = req.body;

		if(!nome_produto || quantidade === undefined){
			return res.status(400).json({
				erro:"nome_produto e quantidade são obrigatórios"
			});
		}

		nome_produto = nome_produto.trim();
		quantidade = Number(quantidade);

		if(!nome_produto){
			return res.status(400).json({
				erro:"Nome do produto inválido"
			});
		}

		// procurar produto
		const prodResult = await db.query(
			`SELECT id FROM produtos
			 WHERE LOWER(nome)=LOWER($1)`,
			[nome_produto]
		);

		let id_produto;

		if(prodResult.rows.length === 0){

			// cria produto se não existir
			const result = await db.query(
				`INSERT INTO produtos
				 (nome, preco, imagem, id_categoria, id_usuario)
				 VALUES($1,$2,$3,$4,$5)
				 RETURNING id`,
				[
					nome_produto,
					0,
					"",
					1,
					req.user.id
				]
			);

			id_produto = result.rows[0].id;

		}else{

			id_produto = prodResult.rows[0].id;

		}

		// verifica estoque existente
		const exists = await db.query(
			`SELECT id FROM estoque
			 WHERE id_produto=$1`,
			[id_produto]
		);

		if(exists.rows.length > 0){
			return res.status(400).json({
				erro:"Estoque já existe para este produto"
			});
		}

		await db.query(
			`INSERT INTO estoque
			 (id_produto, quantidade)
			 VALUES($1,$2)`,
			[id_produto, quantidade]
		);

		res.json({
			msg:`Estoque do produto "${nome_produto}" cadastrado com sucesso`
		});

	}catch(err){

		console.error("ERRO ESTOQUE:",err);

		res.status(500).json({
			erro:"Erro ao cadastrar estoque"
		});

	}

};


/* =========================
   ATUALIZAR ESTOQUE
========================= */
export const atualizarEstoque = async (req, res) => {

	try{

		let { id_produto, nome_produto, quantidade } = req.body;

		if(!id_produto || !nome_produto || quantidade === undefined){
			return res.status(400).json({
				erro:"id_produto, nome_produto e quantidade obrigatórios"
			});
		}

		nome_produto = nome_produto.trim();
		quantidade = Number(quantidade);

		await db.query(
			`UPDATE produtos
			 SET nome=$1
			 WHERE id=$2`,
			[nome_produto,id_produto]
		);

		const exists = await db.query(
			`SELECT id FROM estoque
			 WHERE id_produto=$1`,
			[id_produto]
		);

		if(exists.rows.length === 0){

			await db.query(
				`INSERT INTO estoque
				 (id_produto,quantidade)
				 VALUES($1,$2)`,
				[id_produto,quantidade]
			);

		}else{

			await db.query(
				`UPDATE estoque
				 SET quantidade=$1
				 WHERE id_produto=$2`,
				[quantidade,id_produto]
			);

		}

		res.json({
			msg:`Estoque do produto "${nome_produto}" atualizado`
		});

	}catch(err){

		console.error(err);

		res.status(500).json({
			erro:"Erro ao atualizar estoque"
		});

	}

};


/* =========================
   DELETAR ESTOQUE
========================= */
export const deletarEstoque = async (req, res) => {

	try{

		const { id_produto } = req.body;

		if(!id_produto){
			return res.status(400).json({
				erro:"id_produto obrigatório"
			});
		}

		await db.query(
			`DELETE FROM estoque
			 WHERE id_produto=$1`,
			[id_produto]
		);

		res.json({
			msg:"Estoque removido com sucesso"
		});

	}catch(err){

		console.error(err);

		res.status(500).json({
			erro:"Erro ao deletar estoque"
		});

	}

};


/* =========================
   LISTAR ESTOQUE
========================= */
export const listarEstoque = async (req, res) => {

	try{

		const result = await db.query(
			`SELECT
				e.id_produto,
				p.nome AS produto,
				e.quantidade
			 FROM estoque e
			 LEFT JOIN produtos p
			 ON e.id_produto=p.id
			 ORDER BY p.nome`
		);

		res.json(result.rows);

	}catch(err){

		console.error(err);

		res.status(500).json({
			erro:"Erro ao listar estoque"
		});

	}

};
