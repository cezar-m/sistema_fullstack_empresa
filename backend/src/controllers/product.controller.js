import db from "../config/db.js";

/* =========================
   CRIAR PRODUTO
========================= */
export const criar = async (req, res) => {
  try {
    const { nome, preco, categoria, quantidade } = req.body;
    const imagem = req.file?.filename || null;
    const id_usuario = req.user?.id;

    if (!id_usuario) {
      return res.status(401).json({ erro: "Não autenticado" });
    }

    if (!nome || !categoria || preco === undefined) {
      return res.status(400).json({ erro: "Nome, preço e categoria são obrigatórios" });
    }

    const idCategoria = Number(categoria);

    const catResult = await db.query(
      "SELECT id FROM categorias WHERE id=$1",
      [idCategoria]
    );

    if (catResult.rows.length === 0) {
      return res.status(400).json({ erro: "Categoria não encontrada" });
    }

    const precoSeguro =
      Number(String(preco).replace(",", ".")) || 0;

    const result = await db.query(
      `INSERT INTO produtos (nome, preco, imagem, id_categoria, id_usuario)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id`,
      [nome, precoSeguro, imagem, idCategoria, id_usuario]
    );

    const id_produto = result.rows[0].id;

    // 🔥 CORRIGIDO: agora estoque tem dono (id_usuario)
    await db.query(
      `INSERT INTO estoque (id_produto, quantidade, id_usuario)
       VALUES ($1,$2,$3)`,
      [id_produto, Number(quantidade) || 0, id_usuario]
    );

    return res.status(201).json({
      id: id_produto,
      nome,
      preco: precoSeguro,
      categoria: idCategoria,
      quantidade: Number(quantidade) || 0,
      imagem,
    });

  } catch (err) {
    console.error("Erro criar produto:", err);
    return res.status(500).json({ erro: "Erro ao criar produto" });
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
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ erro: "Não autenticado" });
    }

    if (!nome || !categoria || preco === undefined) {
      return res.status(400).json({ erro: "Nome, preço e categoria são obrigatórios" });
    }

    const catResult = await db.query(
      "SELECT id FROM categorias WHERE id=$1",
      [categoria]
    );

    if (catResult.rows.length === 0) {
      return res.status(400).json({ erro: "Categoria não encontrada" });
    }

    const precoSeguro =
      Number(String(preco).replace(",", ".")) || 0;

    let query = `
      UPDATE produtos 
      SET nome=$1, preco=$2, id_categoria=$3
    `;

    const params = [nome, precoSeguro, categoria];
    let index = 4;

    if (imagem) {
      query += `, imagem=$${index}`;
      params.push(imagem);
      index++;
    }

    query += ` WHERE id=$${index} AND id_usuario=$${index + 1}`;
    params.push(id, userId);

    await db.query(query, params);

    if (quantidade !== undefined) {
      await db.query(
        `UPDATE estoque 
         SET quantidade=$1 
         WHERE id_produto=$2 AND id_usuario=$3`,
        [Number(quantidade), id, userId]
      );
    }

    return res.json({
      id,
      nome,
      preco: precoSeguro,
      categoria,
      quantidade: Number(quantidade) || 0,
      imagem: imagem || null,
    });

  } catch (err) {
    console.error("Erro atualizar produto:", err);
    return res.status(500).json({ erro: "Erro ao atualizar produto" });
  }
};


/* =========================
   LISTAR PRODUTOS (POR USUÁRIO)
========================= */
export const listar = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ erro: "Não autenticado" });
    }

    const result = await db.query(`
      SELECT
        p.id,
        p.nome,
        p.imagem,
        p.preco,

        p.id_categoria,
        COALESCE(c.nome, 'Sem categoria') AS categoria_nome,

        COALESCE(e.quantidade, 0) AS quantidade

      FROM produtos p
      LEFT JOIN categorias c ON p.id_categoria = c.id
      LEFT JOIN estoque e 
        ON p.id = e.id_produto 
       AND e.id_usuario = $1
      WHERE p.id_usuario = $1
      ORDER BY p.nome ASC
    `, [userId]);

    const produtos = result.rows.map(p => ({
      id: p.id,
      nome: p.nome,
      imagem: p.imagem,
      preco: Number(p.preco) || 0,
      id_categoria: p.id_categoria,
      categoria: p.categoria_nome,
      quantidade: Number(p.quantidade) || 0
    }));

    return res.json(produtos);

  } catch (err) {
    console.error("Erro listar produtos:", err);
    return res.status(500).json({ erro: "Erro ao listar produtos" });
  }
};


/* =========================
   DELETAR PRODUTO
========================= */
export const deletar = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ erro: "Não autenticado" });
    }

    await db.query(
      "DELETE FROM estoque WHERE id_produto=$1 AND id_usuario=$2",
      [id, userId]
    );

    await db.query(
      "DELETE FROM produtos WHERE id=$1 AND id_usuario=$2",
      [id, userId]
    );

    return res.json({ msg: "Produto deletado com sucesso!" });

  } catch (err) {
    console.error("Erro deletar produto:", err);
    return res.status(500).json({ erro: "Erro ao deletar produto" });
  }
};
