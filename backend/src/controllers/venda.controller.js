import db from "../config/db.js";

// ========================= CRIAR VENDA =========================
export const criarVenda = async (req, res) => {
  let client;
  try {
    client = await db.connect();
    await client.query("BEGIN");

    if (!req.user?.id) {
      await client.query("ROLLBACK");
      return res.status(401).json({ erro: "Usuário não autenticado" });
    }
    const id_usuario = req.user.id;

    const { itens } = req.body;
    if (!Array.isArray(itens) || itens.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ erro: "Itens obrigatórios" });
    }

    let total = 0;

    const vendaRes = await client.query(
      `INSERT INTO vendas (id_usuario, total, data_venda)
       VALUES ($1, 0, NOW()) RETURNING id`,
      [id_usuario]
    );
    const id_venda = vendaRes.rows[0].id;

    for (const item of itens) {
      // Garante que sempre são números
      const idProduto = parseInt(item.id_produto);
      const quantidade = parseInt(item.quantidade);

      if (!idProduto || !quantidade || quantidade <= 0) {
        throw new Error(`Produto ou quantidade inválidos: ${JSON.stringify(item)}`);
      }

      const prodRes = await client.query(
        `SELECT id, nome, preco FROM produtos WHERE id = $1`,
        [idProduto]
      );
      if (prodRes.rows.length === 0) {
        throw new Error(`Produto ID ${idProduto} não encontrado`);
      }
      const produto = prodRes.rows[0];

      const estoqueRes = await client.query(
        `SELECT quantidade FROM estoque WHERE id_produto = $1`,
        [idProduto]
      );
      if (estoqueRes.rows.length === 0) {
        throw new Error(`Produto "${produto.nome}" sem estoque`);
      }
      if (quantidade > parseInt(estoqueRes.rows[0].quantidade)) {
        throw new Error(`Estoque insuficiente para "${produto.nome}"`);
      }

      const subtotal = parseFloat(produto.preco) * quantidade;
      total += subtotal;

      await client.query(
        `INSERT INTO itens_venda (id_venda, id_produto, quantidade, preco_unitario)
         VALUES ($1, $2, $3, $4)`,
        [id_venda, idProduto, quantidade, parseFloat(produto.preco)]
      );

      await client.query(
        `UPDATE estoque SET quantidade = quantidade - $1 WHERE id_produto = $2`,
        [quantidade, idProduto]
      );
    }

    await client.query(`UPDATE vendas SET total = $1 WHERE id = $2`, [total, id_venda]);
    await client.query("COMMIT");

    return res.json({ sucesso: true, id: id_venda, total });
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error("ERRO CRIAR VENDA:", err);
    return res.status(500).json({ erro: err.message });
  } finally {
    if (client) client.release();
  }
};

// ========================= LISTAR VENDAS =========================
export const listarVendas = async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT 
        v.id,
        v.total,
        v.data_venda,
        COALESCE(json_agg(
          json_build_object(
            'id_produto', p.id,
            'produto', p.nome,
            'imagem', p.imagem,
            'preco', iv.preco_unitario,
            'quantidade', iv.quantidade
          )
        ) FILTER (WHERE iv.id IS NOT NULL), '[]') AS itens
      FROM vendas v
      LEFT JOIN itens_venda iv ON iv.id_venda = v.id
      LEFT JOIN produtos p ON p.id = iv.id_produto
      WHERE v.id_usuario = $1
      GROUP BY v.id
      ORDER BY v.id DESC
      `,
      [req.user.id]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("ERRO LISTAR VENDAS:", err);
    return res.status(500).json({ erro: err.message });
  }
};
