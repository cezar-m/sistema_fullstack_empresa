import db from "../config/db.js";

// ================= CRIAR PAGAMENTO =================
export const criarPagamento = async (req, res) => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const { ids_vendas, parcelas } = req.body;

    if (!ids_vendas?.length) {
      throw new Error("Nenhuma venda enviada");
    }

    let total = 0;

    // 🔥 trava e valida vendas
    const vendas = await client.query(
      `SELECT id, total, pago 
       FROM vendas 
       WHERE id = ANY($1)
       FOR UPDATE`,
      [ids_vendas]
    );

    if (vendas.rows.length !== ids_vendas.length) {
      throw new Error("Venda inválida");
    }

    for (let v of vendas.rows) {
      if (v.pago) {
        throw new Error(`Venda ${v.id} já paga`);
      }

      total += Number(v.total) || 0;
    }

    // 🔥 cria UM pagamento só
    const pagamento = await client.query(
      `INSERT INTO pagamentos (valor, status)
       VALUES ($1,'pendente')
       RETURNING id`,
      [total]
    );

    const id = pagamento.rows[0].id;

    // 🔥 vincula vendas ao pagamento + marca como pago
    for (let v of vendas.rows) {
      await client.query(
        `UPDATE vendas 
         SET pago=true,
         WHERE id=$1`,
        [id, v.id]
      );
    }

    // 🔥 parcelas
    if (parcelas?.length) {
      for (let p of parcelas) {
        await client.query(
          `INSERT INTO parcelas (id_pagamento, numero_parcela, valor, data_vencimento, status)
           VALUES ($1,$2,$3,$4,'pendente')`,
          [id_pagamento, p.numero, p.valor, p.data_vencimento]
        );
      }
    }

    await client.query("COMMIT");

    res.json({ sucesso: true, total });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ erro: err.message });
  } finally {
    client.release();
  }
};


// ================= MARCAR COMO PAGO =================
export const marcarComoPago = async (req, res) => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const { id } = req.params;

    const pag = await client.query(
      `SELECT id_venda FROM pagamentos WHERE id=$1`,
      [id]
    );

    if (!pag.rows.length) throw new Error("Pagamento não encontrado");

    const id_venda = pag.rows[0].id_venda;

    // marca pagamento
    await client.query(
      `UPDATE pagamentos SET status='pago' WHERE id=$1`,
      [id]
    );

    // 🔥 MARCA VENDA COMO PAGA
    await client.query(
      `UPDATE vendas SET pago=true WHERE id=$1`,
      [id_venda]
    );

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
       WHERE v.id_usuario=$1
       GROUP BY p.id
       ORDER BY p.id DESC`,
      [req.user.id]
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
    const result = await db.query(
      `SELECT 
        pa.id,
        pa.numero_parcela,
        pa.valor,
        pa.status,
        pr.nome AS produto
      FROM parcelas pa
      JOIN pagamentos p ON p.id = pa.id_pagamento
      JOIN vendas v ON v.id = p.id_venda
      JOIN itens_venda iv ON iv.id_venda = v.id
      JOIN produtos pr ON pr.id = iv.id_produto
      WHERE pa.id_pagamento = $1`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
};

/* =========================
   ATUALIZAR PARCELA
========================= */
export const atualizarParcelas = async (req, res) => {
  try {
    await db.query(
      `UPDATE parcelas SET status=$1 WHERE id=$2`,
      [req.body.status, req.params.id]
    );

    res.json({ sucesso: true });
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
};
