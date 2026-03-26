import db from "../config/db.js";

/* =========================
   CRIAR PAGAMENTO
========================= */
export const criarPagamento = async (req, res) => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const id_usuario = req.user?.id;
    if (!id_usuario) throw new Error("Usuário não autenticado");

    const { id_venda, id_forma_pagamento, parcelas } = req.body;

    if (!id_venda || !id_forma_pagamento)
      throw new Error("Venda ou forma de pagamento não informados");

    // 🔥 NÃO DUPLICAR PAGAMENTO
    const existe = await client.query(
      `SELECT id FROM pagamentos WHERE id_venda=$1`,
      [id_venda]
    );

    if (existe.rows.length > 0) {
      throw new Error("Pagamento já existe para essa venda");
    }

    // pega itens
    const { rows: itens } = await client.query(
      `SELECT quantidade, preco_unitario AS preco
       FROM itens_venda
       WHERE id_venda=$1`,
      [id_venda]
    );

    if (!itens.length)
      throw new Error("Itens da venda não encontrados");

    const valor_total = itens.reduce(
      (acc, i) => acc + i.quantidade * i.preco,
      0
    );

    const result = await client.query(
      `INSERT INTO pagamentos (id_venda, valor, status, data_pagamento)
       VALUES ($1, $2, 'pendente', NOW()) RETURNING id`,
      [id_venda, valor_total]
    );

    const id_pagamento = result.rows[0].id;

    // parcelas
    if (parcelas && parcelas.length > 0) {
      for (let p of parcelas) {
        await client.query(
          `INSERT INTO parcelas (id_pagamento, numero_parcela, valor, data_vencimento, status)
           VALUES ($1,$2,$3,$4,'pendente')`,
          [id_pagamento, p.numero, p.valor, p.data_vencimento]
        );
      }
    }

    await client.query("COMMIT");

    res.json({ sucesso: true, id: id_pagamento });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ERRO CRIAR PAGAMENTO:", err);
    res.status(400).json({ erro: err.message });
  } finally {
    client.release();
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
    const { status } = req.body;

    if (!status) throw new Error("Status não informado");

    await client.query(
      `UPDATE pagamentos SET status=$1 WHERE id=$2`,
      [status, id]
    );

    await client.query("COMMIT");

    res.json({ sucesso: true });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ERRO PAGAR:", err);
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
      `SELECT * FROM parcelas WHERE id_pagamento=$1`,
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
