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

    if (!id_venda || !id_forma_pagamento) {
      throw new Error("Venda ou forma de pagamento não informados");
    }

    // calcula valor total da venda
    const { rows: itens } = await client.query(
      `SELECT id_produto, quantidade, preco FROM itens_venda iv
       JOIN produtos p ON p.id = iv.id_produto
       WHERE id_venda=$1`,
      [id_venda]
    );

    const valor_total = itens.reduce((acc, i) => acc + i.quantidade * i.preco, 0);

    // cria pagamento
    const resultPagamento = await client.query(
      `INSERT INTO pagamentos (id_venda, valor, status, data_pagamento) 
       VALUES ($1, $2, $3, NOW()) RETURNING id`,
      [id_venda, valor_total, "pendente"]
    );

    const id_pagamento = resultPagamento.rows[0].id;

    // cria parcelas
    if (parcelas && parcelas.length > 0) {
      for (let parcela of parcelas) {
        await client.query(
          `INSERT INTO parcelas (id_pagamento, numero_parcela, valor, data_vencimento, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [id_pagamento, parcela.numero, parcela.valor, parcela.data_vencimento, "pendente"]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ sucesso: true, id: id_pagamento });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(400).json({ erro: err.message });
  } finally {
    client.release();
  }
};

/* =========================
   MARCAR PAGAMENTO COMO PAGO
   (atualiza status da venda e quantidade_paga)
========================= */
export const marcarComoPago = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { id } = req.params;
    const { status } = req.body;

    if (!status) throw new Error("Status não informado");

    // atualiza status do pagamento
    await client.query(`UPDATE pagamentos SET status=$1 WHERE id=$2`, [status, id]);

    if (status === "pago") {
      // atualiza quantidade_paga de cada item da venda
      const { rows: itens } = await client.query(
        `SELECT id_produto, quantidade FROM itens_venda WHERE id_venda=(SELECT id_venda FROM pagamentos WHERE id=$1)`,
        [id]
      );

      for (let i of itens) {
        await client.query(
          `UPDATE itens_venda
           SET quantidade_paga = COALESCE(quantidade_paga,0) + $1
           WHERE id_venda=(SELECT id_venda FROM pagamentos WHERE id=$2) AND id_produto=$3`,
          [i.quantidade, id, i.id_produto]
        );
      }
    }

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

/* =========================
   LISTAR PAGAMENTOS DO USUÁRIO
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
              'quantidade', iv.quantidade,
              'quantidade_paga', iv.quantidade_paga
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
       WHERE id_pagamento=$1
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
export const atualizarParcelas = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) throw new Error("Status não informado");

    await db.query(`UPDATE parcelas SET status=$1 WHERE id=$2`, [status, id]);
    res.json({ sucesso: true });

  } catch (err) {
    console.error(err);
    res.status(400).json({ erro: err.message });
  }
};

/* =========================
   RELATÓRIO TOTAL POR PRODUTO
========================= */
export const listarVendas = async (req, res) => {
  try {
    const id_usuario = req.user.id;

    const result = await db.query(
      `SELECT 
        pr.nome AS produto,
        SUM(iv.quantidade - COALESCE(iv.quantidade_paga,0)) AS quantidade
       FROM vendas v
       JOIN itens_venda iv ON iv.id_venda = v.id
       JOIN produtos pr ON pr.id = iv.id_produto
       WHERE v.id_usuario=$1
       GROUP BY pr.nome`,
      [id_usuario]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(400).json({ erro: err.message });
  }
};
