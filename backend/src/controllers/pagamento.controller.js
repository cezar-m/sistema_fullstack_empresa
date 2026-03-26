// src/controllers/pagamento.controller.js
import db from "../config/db.js";

/* =========================
   CRIAR VENDA + PAGAMENTO
========================= */
export const criarPagamento = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const id_usuario = req.user?.id;
    if (!id_usuario) throw new Error("Usuário não autenticado");

    const { itens, id_forma_pagamento, parcelas = [] } = req.body;
    if (!itens || itens.length === 0) throw new Error("Itens não informados");
    if (!id_forma_pagamento) throw new Error("Forma de pagamento não informada");

    // Cria venda
    const resultVenda = await client.query(
      `INSERT INTO vendas (id_usuario) VALUES ($1) RETURNING id`,
      [id_usuario]
    );
    const id_venda = resultVenda.rows[0].id;

    // Insere itens da venda
    for (let item of itens) {
      await client.query(
        `INSERT INTO itens_venda (id_venda, id_produto, quantidade) VALUES ($1, $2, $3)`,
        [id_venda, item.id_produto, item.quantidade]
      );
    }

    // Calcula valor total
    const total = itens.reduce((acc, i) => acc + i.quantidade * Number(i.preco || 0), 0);

    // Cria pagamento
    const resultPagamento = await client.query(
      `INSERT INTO pagamentos (id_venda, id_forma_pagamento, valor, status) VALUES ($1, $2, $3, $4) RETURNING id`,
      [id_venda, id_forma_pagamento, total, "pendente"]
    );
    const id_pagamento = resultPagamento.rows[0].id;

    // Insere parcelas
    for (let parcela of parcelas) {
      await client.query(
        `INSERT INTO parcelas (id_pagamento, numero_parcela, valor, data_vencimento, status) 
         VALUES ($1, $2, $3, $4, $5)`,
        [id_pagamento, parcela.numero, parcela.valor, parcela.data_vencimento, "pendente"]
      );
    }

    await client.query("COMMIT");
    res.json({ id_venda, id_pagamento });
  } catch (err) {
    await client.query("ROLLBACK");
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
    console.error(err);
    res.status(400).json({ erro: err.message });
  }
};

/* =========================
   LISTAR PARCELAS DE UM PAGAMENTO
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
    console.error(err);
    res.status(400).json({ erro: err.message });
  }
};

/* =========================
   ATUALIZAR STATUS DE UMA PARCELA
========================= */
export const atualizarParcelas = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { id } = req.params;
    const { status } = req.body;
    if (!status) throw new Error("Status não informado");

    // Atualiza parcela
    await client.query(`UPDATE parcelas SET status=$1 WHERE id=$2`, [status, id]);

    // Verifica se todas parcelas estão pagas para atualizar pagamento
    const { rows } = await client.query(
      `SELECT id_pagamento, COUNT(*) FILTER (WHERE status != 'pago') AS pendentes
       FROM parcelas WHERE id_pagamento = (SELECT id_pagamento FROM parcelas WHERE id=$1)
       GROUP BY id_pagamento`,
      [id]
    );

    if (rows.length > 0 && rows[0].pendentes === 0) {
      // Atualiza pagamento e estoque
      const id_pagamento = rows[0].id_pagamento;

      await client.query(`UPDATE pagamentos SET status='pago' WHERE id=$1`, [id_pagamento]);

      // Atualiza estoque apenas uma vez
      const { rows: itens } = await client.query(
        `SELECT iv.id_produto, iv.quantidade
         FROM itens_venda iv
         JOIN pagamentos p ON p.id_venda = iv.id_venda
         WHERE p.id = $1`,
        [id_pagamento]
      );

      for (let i of itens) {
        await client.query(
          `UPDATE produtos SET quantidade = quantidade - $1 WHERE id=$2`,
          [i.quantidade, i.id_produto]
        );
      }
    }

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
   MARCAR PAGAMENTO COMO PAGO/CANCELADO/PENDENTE
========================= */
export const marcarComoPago = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) throw new Error("Status não informado");

    await db.query(`UPDATE pagamentos SET status=$1 WHERE id=$2`, [status, id]);
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
        SUM(iv.quantidade) AS quantidade
       FROM vendas v
       JOIN itens_venda iv ON iv.id_venda = v.id
       JOIN produtos pr ON pr.id = iv.id_produto
       WHERE v.id_usuario = $1
       GROUP BY pr.nome
       ORDER BY pr.nome`,
      [id_usuario]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(400).json({ erro: err.message });
  }
};
