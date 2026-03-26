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

    const { ids_vendas, id_forma_pagamento, parcelas } = req.body;

    if (!ids_vendas || ids_vendas.length === 0)
      throw new Error("Vendas não informadas");

    let valor_total = 0;
    const pagamentosCriados = [];

    for (let id_venda of ids_vendas) {

      // 🔥 PEGAR ITENS + O QUE JÁ FOI PAGO
      const { rows: itens } = await client.query(
        `SELECT 
           id_produto,
           quantidade,
           preco_unitario AS preco,
           COALESCE(quantidade_paga,0) as quantidade_paga
         FROM itens_venda
         WHERE id_venda = $1`,
        [id_venda]
      );

      if (!itens.length) continue;

      let totalVenda = 0;

      for (let item of itens) {

        const pendente = item.quantidade - item.quantidade_paga;

        // 🔥 BLOQUEIA PAGAMENTO DUPLICADO
        if (pendente <= 0) continue;

        totalVenda += pendente * item.preco;
      }

      // 🔥 SE JÁ FOI PAGO, NÃO CRIA OUTRO PAGAMENTO
      if (totalVenda <= 0) continue;

      valor_total += totalVenda;

      const resultPagamento = await client.query(
        `INSERT INTO pagamentos (id_venda, valor, status, data_pagamento)
         VALUES ($1, $2, $3, NOW()) RETURNING id`,
        [id_venda, totalVenda, "pendente"]
      );

      const id_pagamento = resultPagamento.rows[0].id;

      pagamentosCriados.push({ id_pagamento, id_venda, totalVenda });

      // parcelas
      if (parcelas && parcelas.length > 0) {
        for (let parcela of parcelas) {
          await client.query(
            `INSERT INTO parcelas (id_pagamento, numero_parcela, valor, data_vencimento, status)
             VALUES ($1, $2, $3, $4, $5)`,
            [id_pagamento, parcela.numero, parcela.valor, parcela.data_vencimento, "pendente"]
          );
        }
      }
    }

    if (pagamentosCriados.length === 0) {
      throw new Error("Todas as vendas já estão pagas");
    }

    await client.query("COMMIT");

    res.json({ sucesso: true, valor_total, pagamentosCriados });

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

    if (status === "pago") {

      const { rows: pagamento } = await client.query(
        `SELECT id_venda FROM pagamentos WHERE id=$1`,
        [id]
      );

      if (!pagamento.length) throw new Error("Pagamento não encontrado");

      const id_venda = pagamento[0].id_venda;

      const { rows: itens } = await client.query(
        `SELECT 
           id_produto,
           quantidade,
           COALESCE(quantidade_paga,0) as quantidade_paga
         FROM itens_venda
         WHERE id_venda=$1`,
        [id_venda]
      );

      for (let item of itens) {

        const pendente = item.quantidade - item.quantidade_paga;

        if (pendente <= 0) continue;

        await client.query(
          `UPDATE itens_venda
           SET quantidade_paga = quantidade_paga + $1
           WHERE id_venda=$2 AND id_produto=$3`,
          [pendente, id_venda, item.id_produto]
        );
      }
    }

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
