import db from "../config/db.js";

/* =========================
   CRIAR PAGAMENTO (várias vendas)
========================= */
export const criarPagamento = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const id_usuario = req.user?.id;
    if (!id_usuario) throw new Error("Usuário não autenticado");

    const { ids_vendas, id_forma_pagamento, parcelas } = req.body;
    if (!ids_vendas || ids_vendas.length === 0 || !id_forma_pagamento)
      throw new Error("Vendas ou forma de pagamento não informadas");

    let valor_total = 0;
    const pagamentosCriados = [];

    for (let id_venda of ids_vendas) {
      // Pega itens da venda
      const { rows: itens } = await client.query(
        `SELECT quantidade, preco_unitario AS preco FROM itens_venda WHERE id_venda=$1`,
        [id_venda]
      );

      if (!itens.length) continue; // ignora venda sem itens

      const totalVenda = itens.reduce((acc, i) => acc + i.quantidade * i.preco, 0);
      valor_total += totalVenda;

      // Cria pagamento para esta venda
      const resultPagamento = await client.query(
        `INSERT INTO pagamentos (id_venda, valor, status, data_pagamento)
         VALUES ($1, $2, $3, NOW()) RETURNING id`,
        [id_venda, totalVenda, "pendente"]
      );

      const id_pagamento = resultPagamento.rows[0].id;
      pagamentosCriados.push({ id_pagamento, id_venda, totalVenda });

      // Cria parcelas se existirem
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
   MARCAR PAGAMENTO COMO PAGO
========================= */
export const marcarComoPago = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { id } = req.params;
    const { status } = req.body;
    if (!status) throw new Error("Status não informado");

    // Atualiza status do pagamento
    await client.query(`UPDATE pagamentos SET status=$1 WHERE id=$2`, [status, id]);

    if (status === "pago") {
      // Pega id_venda
      const { rows: vendaRows } = await client.query(
        `SELECT id_venda FROM pagamentos WHERE id=$1`,
        [id]
      );
      if (!vendaRows.length) throw new Error("Venda não encontrada");
      const id_venda = vendaRows[0].id_venda;

      // Atualiza quantidade paga em cada item
      const { rows: itens } = await client.query(
        `SELECT id_produto, quantidade, COALESCE(quantidade_paga,0) AS quantidade_paga
         FROM itens_venda
         WHERE id_venda=$1`,
        [id_venda]
      );

      for (let i of itens) {
        const novaQtdPaga = Math.min(i.quantidade_paga + i.quantidade, i.quantidade);
        await client.query(
          `UPDATE itens_venda
           SET quantidade_paga=$1
           WHERE id_venda=$2 AND id_produto=$3`,
          [novaQtdPaga, id_venda, i.id_produto]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ sucesso: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ERRO MARCAR PAGAMENTO COMO PAGO:", err);
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
    const id_usuario = req.user?.id;
    if (!id_usuario) throw new Error("Usuário não autenticado");

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
               'quantidade', iv.quantidade,
               'quantidade_paga', COALESCE(iv.quantidade_paga,0)
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
      `SELECT id, numero_parcela, valor, data_vencimento, status
       FROM parcelas
       WHERE id_pagamento=$1
       ORDER BY numero_parcela`,
      [id]
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
export const atualizarParcelas = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) throw new Error("Status não informado");

    await db.query(`UPDATE parcelas SET status=$1 WHERE id=$2`, [status, id]);
    res.json({ sucesso: true });
  } catch (err) {
    console.error("ERRO ATUALIZAR PARCELA:", err);
    res.status(400).json({ erro: err.message });
  }
};
