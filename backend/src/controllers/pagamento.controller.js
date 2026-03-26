import db from "../config/db.js";

/* =========================
   CRIAR VENDA
========================= */
export const criarVenda = async (req, res) => {
  let client;
  try {
    client = await db.connect();
    await client.query("BEGIN");

    const id_usuario = req.user?.id;
    const { itens } = req.body;

    if (!id_usuario || !itens || !itens.length) {
      throw new Error("Dados da venda incompletos");
    }

    const venda = await client.query(
      `INSERT INTO vendas (id_usuario, data_venda)
       VALUES ($1, NOW())
       RETURNING id`,
      [id_usuario]
    );

    const id_venda = venda.rows[0].id;

    for (const i of itens) {
      await client.query(
        `INSERT INTO itens_venda (id_venda, id_produto, quantidade)
         VALUES ($1, $2, $3)`,
        [id_venda, i.id_produto, i.quantidade]
      );
    }

    await client.query("COMMIT");
    res.json({ sucesso: true, id: id_venda });

  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error(err);
    res.status(400).json({ erro: err.message });
  } finally {
    if (client) client.release();
  }
};

/* =========================
   CRIAR PAGAMENTO
========================= */
export const criarPagamento = async (req, res) => {
  let client;

  try {
    client = await db.connect();
    await client.query("BEGIN");

    const { id_venda, id_forma_pagamento, parcelas = [] } = req.body;

    if (!id_venda || !id_forma_pagamento) {
      throw new Error("Dados incompletos");
    }

    const venda = await client.query(
      `SELECT v.id, SUM(iv.quantidade * pr.preco) AS total
       FROM vendas v
       JOIN itens_venda iv ON iv.id_venda = v.id
       JOIN produtos pr ON pr.id = iv.id_produto
       WHERE v.id = $1
       GROUP BY v.id`,
      [id_venda]
    );

    if (venda.rows.length === 0) throw new Error("Venda não encontrada");

    const valor = venda.rows[0].total;
    const status = parcelas.length > 0 ? "pendente" : "pago";

    const pagamento = await client.query(
      `INSERT INTO pagamentos
       (id_venda, id_forma_pagamento, valor, status, data_pagamento)
       VALUES ($1,$2,$3,$4,NOW())
       RETURNING id`,
      [id_venda, id_forma_pagamento, valor, status]
    );

    const id_pagamento = pagamento.rows[0].id;

    for (const p of parcelas) {
      await client.query(
        `INSERT INTO parcelas
         (id_pagamento, numero_parcela, valor, data_vencimento, status)
         VALUES ($1,$2,$3,$4,'pendente')`,
        [id_pagamento, p.numero, p.valor, p.data_vencimento]
      );
    }

    await client.query("COMMIT");
    res.json({ sucesso: true });

  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error(err);
    res.status(400).json({ erro: err.message });
  } finally {
    if (client) client.release();
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
export const atualizarParcela = async (req, res) => {
  let client;
  try {
    client = await db.connect();
    await client.query("BEGIN");

    const { id } = req.params;
    const { status } = req.body;

    const parcela = await client.query(
      `UPDATE parcelas
       SET status = $1
       WHERE id = $2
       RETURNING id_pagamento`,
      [status, id]
    );

    if (parcela.rows.length === 0) throw new Error("Parcela não encontrada");

    const id_pagamento = parcela.rows[0].id_pagamento;

    const pendentes = await client.query(
      `SELECT 1 FROM parcelas
       WHERE id_pagamento = $1 AND status != 'pago'`,
      [id_pagamento]
    );

    await client.query(
      `UPDATE pagamentos
       SET status = $1
       WHERE id = $2`,
      [pendentes.rows.length === 0 ? "pago" : "pendente", id_pagamento]
    );

    await client.query("COMMIT");
    res.json({ sucesso: true });

  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error(err);
    res.status(400).json({ erro: err.message });
  } finally {
    if (client) client.release();
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
