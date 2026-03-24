import db from "../config/db.js";

// ================= CRIAR VENDA =================
export const criarVenda = async (req, res) => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const { itens } = req.body;

    if (!Array.isArray(itens) || itens.length === 0) {
      throw new Error("Itens obrigatórios");
    }

    let total = 0;

    const vendaRes = await client.query(
      `INSERT INTO vendas (total, data_venda)
       VALUES (0, NOW()) RETURNING id`
    );

    const id_venda = vendaRes.rows[0].id;

    for (const item of itens) {
      const id_produto = Number(item.id_produto);
      const quantidade = Number(item.quantidade);

      if (isNaN(id_produto) || quantidade <= 0) {
        throw new Error("Produto ou quantidade inválidos");
      }

      const prod = await client.query(
        "SELECT nome, preco FROM produtos WHERE id=$1",
        [id_produto]
      );

      if (prod.rows.length === 0) {
        throw new Error("Produto não encontrado");
      }

      const estoque = await client.query(
        "SELECT quantidade FROM estoque WHERE id_produto=$1",
        [id_produto]
      );

      if (quantidade > estoque.rows[0].quantidade) {
        throw new Error("Estoque insuficiente");
      }

      const preco = Number(prod.rows[0].preco);
      total += preco * quantidade;

      await client.query(
        `INSERT INTO itens_venda (id_venda,id_produto,quantidade,preco_unitario)
         VALUES ($1,$2,$3,$4)`,
        [id_venda, id_produto, quantidade, preco]
      );

      await client.query(
        `UPDATE estoque SET quantidade = quantidade - $1 WHERE id_produto=$2`,
        [quantidade, id_produto]
      );
    }

    await client.query(
      "UPDATE vendas SET total=$1 WHERE id=$2",
      [total, id_venda]
    );

    await client.query("COMMIT");

    res.json({ sucesso: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(400).json({ erro: err.message });
  } finally {
    client.release();
  }
};

// ================= LISTAR =================
export const listarVendas = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        v.id,
        v.total,
        v.data_venda,

        COALESCE(
          json_agg(
            json_build_object(
              'produto', p.nome,
              'quantidade', iv.quantidade,

              -- 🔥 AQUI: desconta se pago
              'quantidade_restante',
              CASE 
                WHEN pag.status = 'pago' THEN 0
                ELSE iv.quantidade
              END
            )
          ) FILTER (WHERE iv.id IS NOT NULL), '[]'
        ) AS itens

      FROM vendas v
      LEFT JOIN itens_venda iv ON iv.id_venda = v.id
      LEFT JOIN produtos p ON p.id = iv.id_produto
      LEFT JOIN pagamentos pag ON pag.id_venda = v.id

      GROUP BY v.id
      ORDER BY v.id DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro listar vendas" });
  }
};
