import db from "../config/db.js";

/* =========================
   CRIAR PAGAMENTO
========================= */
export const criarVenda = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const id_usuario = req.user?.id;
    if (!id_usuario) throw new Error("Usuário não autenticado");

    const { itens } = req.body;

    const result = await client.query(
      `INSERT INTO vendas (id_usuario) VALUES ($1) RETURNING id`,
      [id_usuario]
    );
    const id_venda = result.rows[0].id;

    for (let item of itens) {
      await client.query(
        `INSERT INTO itens_venda (id_venda, id_produto, quantidade) VALUES ($1, $2, $3)`,
        [id_venda, item.id_produto, item.quantidade]
      );
    }

    await client.query("COMMIT");
    res.json({ id: id_venda });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ erro: err.message });
  } finally {
    client.release();
  }
};


/* =========================
   LISTAR PAGAMENTOS POR USUÁRIO
========================= */
export const listarPagamentosPorId = async (req, res) => {
  try {
    const id_usuario = req.user.id;

    const result = await db.query(
      `SELECT 
        p.id,
        p.valor,
        p.status,
        p.data_pagamento,
        COALESCE(
          json_agg(
            json_build_object(
              'produto', pr.nome,
              'quantidade', iv.quantidade
            )
          ) FILTER (WHERE iv.id IS NOT NULL),
          '[]'
        ) AS itens
       FROM pagamentos p
       JOIN vendas v ON v.id = p.id_venda
       LEFT JOIN itens_venda iv ON iv.id_venda = v.id
       LEFT JOIN produtos pr ON pr.id = iv.id_produto
       WHERE v.id_usuario = $1
       GROUP BY p.id
       ORDER BY p.id DESC`,
      [id_usuario]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(400).json({ erro: err.message });
  }
};

/* =========================
   LISTAR PARCELAS
========================= */
export const listarParcelasPorPagamento = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT id, numero_parcela, valor, data_vencimento, status
       FROM parcelas
       WHERE id_pagamento = $1
       ORDER BY numero_parcela`,
      [id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(400).json({ erro: err.message });
  }
};

/* =========================
   ATUALIZAR PARCELA
========================= */
export const atualizarParcelas = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { id } = req.params;

    // Atualiza o status do pagamento
    await client.query(`UPDATE pagamentos SET status='pago' WHERE id=$1`, [id]);

    // Pega itens da venda
    const { rows: itens } = await client.query(`
      SELECT id_produto, quantidade
      FROM itens_venda
      WHERE id_venda = (SELECT id_venda FROM pagamentos WHERE id=$1)
    `, [id]);

    // Atualiza estoque
    for (let i of itens) {
      await client.query(`
        UPDATE produtos
        SET quantidade = quantidade - $1
        WHERE id = $2
      `, [i.quantidade, i.id_produto]);
    }

    await client.query("COMMIT");
    res.json({ sucesso: true });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ erro: err.message });
  } finally {
    client.release();
  }
};


/* =========================
   MARCAR PAGAMENTO COMO PAGO
========================= */
export const marcarComoPago = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await db.query(
      `UPDATE pagamentos SET status = $1 WHERE id = $2`,
      [status, id]
    );

    res.json({ sucesso: true });

  } catch (err) {
    console.error(err);
    res.status(400).json({ erro: err.message });
  }
};

/* =========================
   LISTAR VENDAS POR PRODUTO (RELATÓRIO)
========================= */
export const listarVendas = async (req, res) => {
  try {
    const id_usuario = req.user.id;

    const result = await db.query(
      `SELECT 
        pr.nome AS produto,
        SUM(iv.quantidade) AS quantidade
       FROM vendas v
       JOIN itens_venda iv ON iv.id_venda = v.id
       JOIN produtos pr ON pr.id = iv.id_produto
       WHERE v.id_usuario = $1
       GROUP BY pr.nome`,
      [id_usuario]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(400).json({ erro: err.message });
  }
};
