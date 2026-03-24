import db from "../config/db.js";

// ================= CRIAR VENDA =================
export const criarVenda = async (req, res) => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const id_usuario = req.user?.id;

    if (!id_usuario) {
      throw new Error("Usuário não autenticado");
    }

    const { itens } = req.body;

    if (!Array.isArray(itens) || itens.length === 0) {
      throw new Error("Itens obrigatórios");
    }

    let total = 0;

    const vendaRes = await client.query(
      `INSERT INTO vendas (id_usuario, total, data_venda)
       VALUES ($1, 0, NOW()) RETURNING id`,
      [id_usuario]
    );

    const id_venda = vendaRes.rows[0].id;

    for (const item of itens) {
      const id_produto = Number(item.id_produto);
      const quantidade = Number(item.quantidade);

      if (!id_produto || quantidade <= 0) {
        throw new Error("Produto ou quantidade inválidos");
      }

      const prod = await client.query(
        "SELECT nome, preco FROM produtos WHERE id=$1",
        [id_produto]
      );

      if (prod.rows.length === 0) {
        throw new Error("Produto não encontrado");
      }

      const preco = Number(prod.rows[0].preco);

      total += preco * quantidade;

      await client.query(
        `INSERT INTO itens_venda (id_venda,id_produto,quantidade,preco_unitario)
         VALUES ($1,$2,$3,$4)`,
        [id_venda, id_produto, quantidade, preco]
      );
    }

    await client.query(
      "UPDATE vendas SET total=$1 WHERE id=$2",
      [total, id_venda]
    );

    await client.query("COMMIT");

    // ✅ CORREÇÃO PRINCIPAL
    res.json({ sucesso: true, id: id_venda, total });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ERRO CRIAR VENDA:", err);
    res.status(400).json({ erro: err.message });
  } finally {
    client.release();
  }
};


// ================= LISTAR =================
export const listarVendas = async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT 
        v.id,
        v.total,
        v.data_venda,
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
      ORDER BY v.id DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("ERRO LISTAR VENDAS:", err);
    res.status(500).json({ erro: "Erro listar vendas" });
  }
};
