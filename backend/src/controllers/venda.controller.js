import db from "../config/db.js";

/* =========================
   CRIAR VENDA
========================= */
export const criarVenda = async (req, res) => {
  let client;

  try {
    client = await db.connect();
    await client.query("BEGIN");

    if (!req.user || !req.user.id) {
      await client.query("ROLLBACK");
      return res.status(401).json({ erro: "Usuário não autenticado" });
    }

    const id_usuario = req.user.id;
    const { itens } = req.body;

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ erro: "Itens obrigatórios" });
    }

    let total = 0;

    const vendaResult = await client.query(
      `INSERT INTO vendas (id_usuario, total, data_venda)
       VALUES ($1, 0, NOW())
       RETURNING id`,
      [id_usuario]
    );

    const id_venda = vendaResult.rows[0].id;

    /* =========================
       PROCESSAR ITENS
    ========================== */
    for (const item of itens) {

      let idProduto = null;
      const quantidade = Number(item.quantidade);

      // 🔥 ACEITA ID OU NOME
      if (item.id_produto) {
        idProduto = Number(item.id_produto);

      } else if (item.nome) {
        const prod = await client.query(
          `SELECT id FROM produtos 
           WHERE LOWER(TRIM(nome)) = LOWER($1)
           LIMIT 1`,
          [item.nome.trim()]
        );

        if (prod.rows.length === 0) {
          throw new Error(`Produto "${item.nome}" não encontrado`);
        }

        idProduto = prod.rows[0].id;
      }

      // 🔥 VALIDAÇÃO REAL
      if (!idProduto || !quantidade || quantidade <= 0) {
        throw new Error("Produto ou quantidade inválidos");
      }

      // 🔥 BUSCA PRODUTO
      const prod = await client.query(
        `SELECT id, nome, preco FROM produtos WHERE id = $1`,
        [idProduto]
      );

      if (prod.rows.length === 0) {
        throw new Error(`Produto ID ${idProduto} não encontrado`);
      }

      const produto = prod.rows[0];

      // 🔥 ESTOQUE
      const estoque = await client.query(
        `SELECT quantidade FROM estoque WHERE id_produto = $1`,
        [idProduto]
      );

      if (estoque.rows.length === 0) {
        throw new Error(`Produto "${produto.nome}" sem estoque`);
      }

      const estoqueAtual = Number(estoque.rows[0].quantidade);

      if (quantidade > estoqueAtual) {
        throw new Error(`Estoque insuficiente para "${produto.nome}"`);
      }

      const preco = Number(produto.preco);
      const subtotal = preco * quantidade;

      total += subtotal;

      // 🔥 INSERE ITEM
      await client.query(
        `INSERT INTO itens_venda
         (id_venda, id_produto, quantidade, preco_unitario)
         VALUES ($1, $2, $3, $4)`,
        [id_venda, idProduto, quantidade, preco]
      );

      // 🔥 ATUALIZA ESTOQUE
      await client.query(
        `UPDATE estoque
         SET quantidade = quantidade - $1
         WHERE id_produto = $2`,
        [quantidade, idProduto]
      );
    }

    // 🔥 ATUALIZA TOTAL
    await client.query(
      `UPDATE vendas SET total = $1 WHERE id = $2`,
      [total, id_venda]
    );

    await client.query("COMMIT");

    return res.json({
      sucesso: true,
      id: id_venda,
      total
    });

  } catch (err) {
    if (client) await client.query("ROLLBACK");

    console.error("ERRO CRIAR VENDA:", err);

    return res.status(500).json({
      erro: err.message
    });

  } finally {
    if (client) client.release();
  }
};


/* =========================
   LISTAR VENDAS
========================= */
export const listarVendas = async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT 
        v.id,
        v.total,
        v.data_venda,

        json_agg(
          json_build_object(
            'produto', p.nome,
            'quantidade', iv.quantidade,
            'preco', iv.preco_unitario
          )
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

    return res.json(result.rows);

  } catch (err) {
    console.error("ERRO LISTAR VENDAS:", err);
    return res.status(500).json({ erro: err.message });
  }
};
