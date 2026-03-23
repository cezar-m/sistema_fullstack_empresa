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

    // 🔥 VALIDAÇÃO
    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ erro: "Itens obrigatórios" });
    }

    let total = 0;

    // 🔥 CRIA VENDA
    const vendaResult = await client.query(
      `INSERT INTO vendas (id_usuario, total, data_venda)
       VALUES ($1, 0, NOW())
       RETURNING id`,
      [id_usuario]
    );

    const id_venda = vendaResult.rows[0].id;

    // 🔥 PROCESSA ITENS
    for (const item of itens) {

      const idProduto = Number(item.id_produto);
      const quantidade = Number(item.quantidade);

      if (!idProduto || !quantidade) {
        throw new Error("Produto ou quantidade inválidos");
      }

      // 🔥 BUSCA PRODUTO
      const prod = await client.query(
        `SELECT id, preco FROM produtos WHERE id = $1`,
        [idProduto]
      );

      if (prod.rows.length === 0) {
        throw new Error(`Produto ID ${idProduto} não encontrado`);
      }

      const produto = prod.rows[0];

      // 🔥 VERIFICA ESTOQUE
      const estoque = await client.query(
        `SELECT quantidade FROM estoque WHERE id_produto = $1`,
        [idProduto]
      );

      if (estoque.rows.length === 0) {
        throw new Error("Produto sem estoque");
      }

      const estoqueAtual = Number(estoque.rows[0].quantidade);

      if (quantidade > estoqueAtual) {
        throw new Error("Estoque insuficiente");
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
      `SELECT * FROM vendas
       WHERE id_usuario = $1
       ORDER BY id DESC`,
      [req.user.id]
    );

    return res.json(result.rows);

  } catch (err) {
    console.error("ERRO LISTAR VENDAS:", err);
    return res.status(500).json({ erro: err.message });
  }
};
