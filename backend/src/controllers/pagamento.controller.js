import db from "../config/db.js";

/* =========================
   CRIAR PAGAMENTO
========================= */
export const criarPagamento = async (req, res) => {
  console.log("BODY:", req.body);

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
      return res.status(400).json({ erro: "Dados incompletos" });
    }

    // 🔥 BUSCA VENDA + ITENS
    const vendaResult = await client.query(
      `SELECT total FROM vendas WHERE id = $1`,
      [idVendaNum]
    );

    if (vendaResult.rows.length === 0) {
      return res.status(404).json({ erro: "Venda não encontrada" });
    }

    const valor = Number(vendaResult.rows[0].total);

    // 🔥 CRIA PAGAMENTO
    const pagamentoResult = await client.query(
      `INSERT INTO pagamentos
       (id_venda, id_forma_pagamento, valor, status, data_pagamento)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [
        idVendaNum,
        idFormaNum,
        valor,
        parcelas.length > 0 ? "pendente" : (status_pagamento || "pago")
      ]
    );

    const id_pagamento = pagamentoResult.rows[0].id;

    // 🔥 SE PAGAMENTO FOR PAGO → ATUALIZA ITENS_VENDA
    if (!parcelas.length || status_pagamento === "pago") {

      const itens = await client.query(
        `SELECT id, quantidade, quantidade_paga
         FROM itens_venda
         WHERE id_venda = $1`,
        [idVendaNum]
      );

      for (const item of itens.rows) {
        const restante = item.quantidade - item.quantidade_paga;

        if (restante > 0) {
          await client.query(
            `UPDATE itens_venda
             SET quantidade_paga = quantidade_paga + $1
             WHERE id = $2`,
            [restante, item.id]
          );
        }
      }
    }

    // 🔥 PARCELAS
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

    await client.query("COMMIT");

    return res.json({ sucesso: true });

  } catch (err) {
    if (client) await client.query("ROLLBACK");

    console.error("ERRO CRIAR PAGAMENTO:", err);

    return res.status(500).json({
      erro: err.message
    });

  } finally {
    if (client) client.release();
  }
};



/* =========================
   LISTAR PAGAMENTOS
========================= */
export const listarPagamentosPorId = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
        p.id,
        p.valor,
        p.status,
        p.data_pagamento,
        v.id AS venda_id,
        json_agg(
          json_build_object(
            'produto', pr.nome,
            'quantidade', iv.quantidade,
            'preco', iv.preco_unitario
          )
        ) AS itens
        FROM pagamentos p
        JOIN vendas v ON v.id = p.id_venda
        JOIN itens_venda iv ON iv.id_venda = v.id
        JOIN produtos pr ON pr.id = iv.id_produto
        WHERE v.id_usuario = $1
        GROUP BY p.id, p.valor, p.status, p.data_pagamento, v.id
        ORDER BY p.id DESC`,
      [req.user.id]
    );

    return res.json(result.rows);

  } catch (err) {
    console.error("ERRO LISTAR PAGAMENTOS:", err);
    return res.status(500).json({ erro: err.message });
  }
};


/* =========================
   MARCAR COMO PAGO
========================= */
export const marcarComoPago = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      `UPDATE pagamentos SET status = 'pago' WHERE id = $1`,
      [Number(id)]
    );

    return res.json({ sucesso: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: err.message });
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
         pa.id,
         pa.numero_parcela,
         pa.valor,
         pa.status,
         pa.data_vencimento,
         json_agg(
           json_build_object(
             'produto', pr.nome,
             'quantidade', iv.quantidade
           )
         ) AS itens
       FROM parcelas pa
       JOIN pagamentos p ON p.id = pa.id_pagamento
       JOIN vendas v ON v.id = p.id_venda
       JOIN itens_venda iv ON iv.id_venda = v.id
       JOIN produtos pr ON pr.id = iv.id_produto
       WHERE pa.id_pagamento = $1
       GROUP BY pa.id
       ORDER BY pa.numero_parcela`,
      [Number(id)]
    );

    return res.json(result.rows);

  } catch (err) {
    console.error("ERRO LISTAR PARCELAS:", err);
    return res.status(500).json({ erro: err.message });
  }
};


/* =========================
   ATUALIZAR PARCELA
========================= */
export const atualizarParcela = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await db.query(
      `UPDATE parcelas SET status = $1 WHERE id = $2`,
      [status, Number(id)]
    );

    return res.json({ sucesso: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: err.message });
  }
};
