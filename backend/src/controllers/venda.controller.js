import db from "../config/db.js";

// ================= CRIAR VENDA =================
export const criarVenda = async (req, res) => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const id_usuario = req.user?.id;
    if (!id_usuario) throw new Error("Usuário não autenticado");

    const { itens } = req.body;
    if (!itens || itens.length === 0) throw new Error("Itens obrigatórios");

    let total = 0;

    const vendaRes = await client.query(
      `INSERT INTO vendas (id_usuario, total, data_venda, pago)
       VALUES ($1, 0, NOW(), false)
       RETURNING id`,
      [id_usuario]
    );

    const id_venda = vendaRes.rows[0].id;

    for (const item of itens) {
      const { id_produto, quantidade } = item;

      const prod = await client.query(
        `SELECT p.preco, e.quantidade
         FROM produtos p
         JOIN estoque e ON e.id_produto = p.id
         WHERE p.id = $1
         FOR UPDATE`,
        [id_produto]
      );

      if (!prod.rows.length) throw new Error("Produto não encontrado");

      const produto = prod.rows[0];

      // 🔥 BLOQUEIA SE NÃO TEM ESTOQUE
      if (produto.quantidade < quantidade) {
        throw new Error("Estoque insuficiente");
      }

      total += produto.preco * quantidade;

      await client.query(
        `INSERT INTO itens_venda (id_venda, id_produto, quantidade, preco_unitario, quantidade_paga)
         VALUES ($1,$2,$3,$4,0)`,
        [id_venda, id_produto, quantidade, produto.preco]
      );

      await client.query(
        `UPDATE estoque SET quantidade = quantidade - $1 WHERE id_produto=$2`,
        [quantidade, id_produto]
      );
    }

    await client.query(
      `UPDATE vendas SET total=$1 WHERE id=$2`,
      [total, id_venda]
    );

    await client.query("COMMIT");

    res.json({ sucesso: true, id: id_venda });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ erro: err.message });
  } finally {
    client.release();
  }
};

// ================= LISTAR VENDAS =================
export const listarVendas = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        v.id, v.total, v.data_venda, v.pago,
        json_agg(
          json_build_object(
            'produto', p.nome,
            'quantidade', iv.quantidade
          )
        ) AS itens
       FROM vendas v
       LEFT JOIN itens_venda iv ON iv.id_venda = v.id
       LEFT JOIN produtos p ON p.id = iv.id_produto
       WHERE v.id_usuario = $1
       GROUP BY v.id
       ORDER BY v.id DESC`,
      [req.user.id]
    );

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};
