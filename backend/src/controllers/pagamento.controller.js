import db from "../config/db.js";

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
      `SELECT total FROM vendas WHERE id = $1`,
      [id_venda]
    );

    if (venda.rows.length === 0) {
      throw new Error("Venda não encontrada");
    }

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

    // criar parcelas
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
    res.status(400).json({ erro: err.message });
  } finally {
    if (client) client.release();
  }
};

/* =========================
   ATUALIZAR STATUS PAGAMENTO
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
   LISTAR PAGAMENTOS
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

    if (parcela.rows.length === 0) {
      throw new Error("Parcela não encontrada");
    }

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

