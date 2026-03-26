import db from "../config/db.js";

// ================= CRIAR VENDA =================
export const criarVenda = async (req, res) => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const id_usuario = req.user?.id;
    if (!id_usuario) throw new Error("Usuário não autenticado");

    const { itens, id_produto, quantidade } = req.body;

    // 🔥 aceita os 2 formatos
    let listaItens = [];

    if (Array.isArray(itens) && itens.length > 0) {
      listaItens = itens;
    } else if (id_produto && quantidade) {
      listaItens = [{ id_produto, quantidade }];
    } else {
      throw new Error("Itens obrigatórios");
    }

    let total = 0;

    // Cria venda
    const vendaRes = await client.query(
      `INSERT INTO vendas (id_usuario, total, data_venda)
       VALUES ($1, 0, NOW()) RETURNING id`,
      [id_usuario]
    );
    const id_venda = vendaRes.rows[0].id;

    for (const item of listaItens) {
      const id_produto = Number(item.id_produto);
      const quantidade = Number(item.quantidade);

      if (!id_produto || quantidade <= 0)
        throw new Error("Produto ou quantidade inválidos");

      // pega produto
      const prodRes = await client.query(
        `SELECT p.id, p.nome, p.preco, e.quantidade
         FROM produtos p
         JOIN estoque e ON e.id_produto = p.id
         WHERE p.id = $1
         FOR UPDATE`,
        [id_produto]
      );

      if (!prodRes.rows.length)
        throw new Error("Produto não encontrado");

      const produtoDB = prodRes.rows[0];

      total += produtoDB.preco * quantidade;

      // insere item
      await client.query(
        `INSERT INTO itens_venda (id_venda, id_produto, quantidade, preco_unitario)
         VALUES ($1, $2, $3, $4)`,
        [id_venda, id_produto, quantidade, produtoDB.preco]
      );

      // 🔥 NÃO BLOQUEIA MAIS POR ESTOQUE
      const novaQtd = Math.max(produtoDB.quantidade - quantidade, 0);

      await client.query(
        `UPDATE estoque SET quantidade = $1 WHERE id_produto = $2`,
        [novaQtd, id_produto]
      );
    }

    await client.query(
      `UPDATE vendas SET total=$1 WHERE id=$2`,
      [total, id_venda]
    );

    await client.query("COMMIT");

    res.json({ sucesso: true, id: id_venda, total });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ERRO CRIAR VENDA:", err);
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

    res.json(result.rows);
  } catch (err) {
    console.error("ERRO LISTAR VENDAS:", err);
    res.status(500).json({ erro: "Erro ao listar vendas" });
  }
};
