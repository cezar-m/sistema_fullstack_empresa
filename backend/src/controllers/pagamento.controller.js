// src/controllers/pagamento.controller.js
import db from "../config/db.js";

/* =========================
   CRIAR PAGAMENTO
========================= */
export const criarPagamento = async (req, res) => {
  let client;
  try {
    client = await db.connect();
    await client.query("BEGIN");

    const {
      id_venda,
      id_forma_pagamento,
      parcelas = [],
      status_pagamento
    } = req.body;

    const idVendaNum = Number(id_venda);
    const idFormaNum = Number(id_forma_pagamento);

    if (!idVendaNum || !idFormaNum) {
      throw new Error("Dados incompletos");
    }

    // valida venda
    const vendaResult = await client.query(
      `SELECT total FROM vendas WHERE id = $1`,
      [idVendaNum]
    );

    if (vendaResult.rows.length === 0) {
      throw new Error("Venda não encontrada");
    }

    const valor = Number(vendaResult.rows[0].total);

    // define status
    const statusFinal =
      parcelas.length > 0 ? "pendente" : (status_pagamento || "pago");

    // cria pagamento
    const pagamentoResult = await client.query(
      `INSERT INTO pagamentos
       (id_venda, id_forma_pagamento, valor, status, data_pagamento)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [idVendaNum, idFormaNum, valor, statusFinal]
    );

    const id_pagamento = pagamentoResult.rows[0].id;

    // cria parcelas
    if (Array.isArray(parcelas) && parcelas.length > 0) {
      const queries = parcelas.map((p) =>
        client.query(
          `INSERT INTO parcelas
           (id_pagamento, numero_parcela, valor, data_vencimento, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            id_pagamento,
            Number(p.numero),
            Number(p.valor),
            p.data_vencimento,
            "pendente"
          ]
        )
      );

      await Promise.all(queries);
    }

    // 🚫 NÃO MEXE NO ESTOQUE AQUI

    await client.query("COMMIT");

    res.json({ sucesso: true, id_pagamento });

  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error("ERRO CRIAR PAGAMENTO:", err);
    res.status(400).json({ erro: err.message });

  } finally {
    if (client) client.release();
  }
};

/* =========================
   MARCAR COMO PAGO
========================= */
export const marcarComoPago = async (req, res) => {
  let client;
  try {
    client = await db.connect();
    await client.query("BEGIN");

    const { id } = req.params;

    const pagamento = await client.query(
      `SELECT status FROM pagamentos WHERE id = $1`,
      [Number(id)]
    );

    if (pagamento.rows.length === 0) {
      throw new Error("Pagamento não encontrado");
    }

    if (pagamento.rows[0].status === "pago") {
      throw new Error("Pagamento já está pago");
    }

    // 🔥 SOMENTE MUDA STATUS
    await client.query(
      `UPDATE pagamentos SET status = 'pago' WHERE id = $1`,
      [Number(id)]
    );

    await client.query("COMMIT");

    res.json({ sucesso: true });

  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error("ERRO MARCAR COMO PAGO:", err);
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
    const id_usuario = req.user?.id;

    if (!id_usuario) {
      throw new Error("Usuário não autenticado");
    }

    const result = await db.query(
      `SELECT 
        p.id,
        p.id_venda,
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
    console.error("ERRO LISTAR PAGAMENTOS:", err);
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
      `SELECT 
        id,
        numero_parcela,
        valor,
        data_vencimento,
        status
       FROM parcelas
       WHERE id_pagamento = $1
       ORDER BY numero_parcela`,
      [Number(id)]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("ERRO LISTAR PARCELAS:", err);
    res.status(400).json({ erro: err.message });
  }
};

/* =========================
   ATUALIZAR PARCELA
========================= */
export const atualizarParcela = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pendente", "pago", "cancelado"].includes(status)) {
      throw new Error("Status inválido");
    }

    await db.query(
      `UPDATE parcelas SET status = $1 WHERE id = $2`,
      [status, Number(id)]
    );

    res.json({ sucesso: true });

  } catch (err) {
    console.error("ERRO ATUALIZAR PARCELA:", err);
    res.status(400).json({ erro: err.message });
  }
};
