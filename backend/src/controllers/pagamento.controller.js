import db from "../config/db.js";

/* =========================
   CRIAR PAGAMENTO
========================= */
export const criarPagamento = async (req, res) => {
  let client;

  try {
    client = await db.connect();
    await client.query("BEGIN");

    let {
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

    // busca venda
    const vendaResult = await client.query(
      `SELECT total FROM vendas WHERE id = $1`,
      [idVendaNum]
    );

    if (vendaResult.rows.length === 0) {
      throw new Error("Venda não encontrada");
    }

    const valor = Number(vendaResult.rows[0].total);

    const statusFinal =
      parcelas.length > 0 ? "pendente" : (status_pagamento || "pago");

    const pagamentoResult = await client.query(
      `INSERT INTO pagamentos
       (id_venda, id_forma_pagamento, valor, status, data_pagamento)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [idVendaNum, idFormaNum, valor, statusFinal]
    );

    const id_pagamento = pagamentoResult.rows[0].id;

    // parcelas
    if (Array.isArray(parcelas) && parcelas.length > 0) {
      for (const p of parcelas) {
        await client.query(
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
        );
      }
    }

    // 🔥 DESCONTA ESTOQUE SE PAGO
    if (statusFinal === "pago") {
      const itensVenda = await client.query(
        `SELECT id_produto, quantidade
         FROM itens_venda
         WHERE id_venda = $1`,
        [idVendaNum]
      );

      for (const item of itensVenda.rows) {
        await client.query(
          `UPDATE estoque
           SET quantidade = quantidade - $1
           WHERE id_produto = $2`,
          [item.quantidade, item.id_produto]
        );
      }
    }

    await client.query("COMMIT");

    res.json({ sucesso: true });

  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error("ERRO PAGAMENTO:", err);
    res.status(400).json({ erro: err.message });

  } finally {
    if (client) client.release();
  }
};

/* =========================
   MARCAR COMO PAGO
========================= */
export const marcarComoPago = async (req, res) => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const { id } = req.params;

    const pagamento = await client.query(
      `SELECT id_venda, status FROM pagamentos WHERE id = $1`,
      [Number(id)]
    );

    if (pagamento.rows.length === 0) {
      throw new Error("Pagamento não encontrado");
    }

    if (pagamento.rows[0].status === "pago") {
      throw new Error("Pagamento já está pago");
    }

    const id_venda = pagamento.rows[0].id_venda;

    // 🔥 desconta estoque
    const itensVenda = await client.query(
      `SELECT id_produto, quantidade
       FROM itens_venda
       WHERE id_venda = $1`,
      [id_venda]
    );

    for (const item of itensVenda.rows) {
      await client.query(
        `UPDATE estoque
         SET quantidade = quantidade - $1
         WHERE id_produto = $2`,
        [item.quantidade, item.id_produto]
      );
    }

    await client.query(
      `UPDATE pagamentos SET status = 'pago' WHERE id = $1`,
      [Number(id)]
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
