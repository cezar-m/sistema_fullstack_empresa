import db from "../config/db.js";

export const criarVenda = async (req, res) => {
  let client;

  try {
    client = await db.connect();
    await client.query("BEGIN");

    const { itens } = req.body;
    const id_usuario = req.user.id;

    if (!itens || itens.length === 0) {
      throw new Error("Nenhum item informado");
    }

    // cria venda
    const venda = await client.query(
      `INSERT INTO vendas (id_usuario, total, status)
       VALUES ($1, 0, 'finalizado')
       RETURNING id`,
      [id_usuario]
    );

    const id_venda = venda.rows[0].id;
    let total = 0;

    for (const item of itens) {
      const produto = await client.query(
        `SELECT preco, quantidade FROM produtos WHERE id = $1`,
        [item.id_produto]
      );

      if (produto.rows.length === 0) {
        throw new Error("Produto não encontrado");
      }

      const preco = Number(produto.rows[0].preco);
      const estoque = Number(produto.rows[0].quantidade);

      if (estoque < item.quantidade) {
        throw new Error("Estoque insuficiente");
      }

      // 🔥 DESCONTA ESTOQUE (AQUI É O CORRETO)
      await client.query(
        `UPDATE produtos
         SET quantidade = quantidade - $1
         WHERE id = $2`,
        [item.quantidade, item.id_produto]
      );

      // salva item
      await client.query(
        `INSERT INTO itens_venda (id_venda, id_produto, quantidade, preco)
         VALUES ($1, $2, $3, $4)`,
        [id_venda, item.id_produto, item.quantidade, preco]
      );

      total += preco * item.quantidade;
    }

    await client.query(
      `UPDATE vendas SET total = $1 WHERE id = $2`,
      [total, id_venda]
    );

    await client.query("COMMIT");

    res.json({ id: id_venda });

  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error("ERRO VENDA:", err);
    res.status(400).json({ erro: err.message });
  } finally {
    if (client) client.release();
  }
};


// LISTAR VENDAS
export const listarVendas = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        v.id, v.total, v.data_venda,
        COALESCE(
          json_agg(
            json_build_object(
              'id_produto', p.id,
              'produto', p.nome,
              'preco', iv.preco_unitario,
              'quantidade', iv.quantidade
            )
          ) FILTER (WHERE iv.id IS NOT NULL), '[]'
        ) AS itens
       FROM vendas v
       LEFT JOIN itens_venda iv ON iv.id_venda = v.id
       LEFT JOIN produtos p ON p.id = iv.id_produto
       WHERE v.id_usuario = $1
       GROUP BY v.id
       ORDER BY v.id DESC`,
      [req.user.id]
    );

    res.json(result.rows.map(v => ({ ...v, itens: v.itens || [] })));
  } catch (err) {
    console.error("ERRO LISTAR VENDAS:", err);
    res.status(500).json({ erro: "Erro ao listar vendas" });
  }
};
