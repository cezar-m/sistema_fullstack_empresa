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

    // pega valor da venda
    const venda = await client.query(
      `SELECT total FROM vendas WHERE id = $1`,
      [id_venda]
    );

    if (venda.rows.length === 0) {
      throw new Error("Venda não encontrada");
    }

    const valor = venda.rows[0].total;

    const status = parcelas.length > 0 ? "pendente" : "pago";

    // cria pagamento
    const pagamento = await client.query(
      `INSERT INTO pagamentos
       (id_venda, id_forma_pagamento, valor, status, data_pagamento)
       VALUES ($1,$2,$3,$4,NOW())
       RETURNING id`,
      [id_venda, id_forma_pagamento, valor, status]
    );

    const id_pagamento = pagamento.rows[0].id;

    // cria parcelas
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
   ATUALIZAR STATUS
========================= */
export const marcarComoPago = async (req, res) => {
  let client;

  try {
    client = await db.connect();
    await client.query("BEGIN");

    const { id } = req.params;
    const { status } = req.body;

    const pagamento = await client.query(
      `SELECT * FROM pagamentos WHERE id = $1`,
      [id]
    );

    if (pagamento.rows.length === 0) {
      throw new Error("Pagamento não encontrado");
    }

    const pag = pagamento.rows[0];

    // 🔥 SE CANCELAR → DEVOLVE ESTOQUE (CORRETO)
    if (status === "cancelado") {

      const itens = await client.query(
        `SELECT * FROM itens_venda WHERE id_venda = $1`,
        [pag.id_venda]
      );

      for (const item of itens.rows) {
        await client.query(
          `UPDATE produtos
           SET quantidade = quantidade + $1
           WHERE id = $2`,
          [item.quantidade, item.id_produto]
        );
      }

      // NÃO apaga venda
      await client.query(
        `UPDATE vendas SET status = 'cancelado' WHERE id = $1`,
        [pag.id_venda]
      );
    }

    // atualizar pagamento
    await client.query(
      `UPDATE pagamentos SET status = $1 WHERE id = $2`,
      [status, id]
    );

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
        json_agg(
          json_build_object(
            'produto', pr.nome,
            'quantidade', iv.quantidade
          )
        ) AS itens
       FROM pagamentos p
       JOIN vendas v ON v.id = p.id_venda
       JOIN itens_venda iv ON iv.id_venda = v.id
       JOIN produtos pr ON pr.id = iv.id_produto
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
   PARCELAS
========================= */
export const listarParcelasPorPagamento = async (req, res) => {
  const { id } = req.params;

  const result = await db.query(
    `SELECT * FROM parcelas WHERE id_pagamento = $1`,
    [id]
  );

  res.json(result.rows);
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
      [status, Number(id)]
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

    if (pendentes.rows.length === 0) {
      await client.query(
        `UPDATE pagamentos SET status = 'pago' WHERE id = $1`,
        [id_pagamento]
      );
    } else {
      await client.query(
        `UPDATE pagamentos SET status = 'pendente' WHERE id = $1`,
        [id_pagamento]
      );
    }

    await client.query("COMMIT");

    res.json({ sucesso: true });

  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error("ERRO PARCELA:", err);
    res.status(400).json({ erro: err.message });
  } finally {
    if (client) client.release();
  }
};

