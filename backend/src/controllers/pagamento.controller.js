import db from "../config/db.js";

/* =========================
   CRIAR PAGAMENTO
========================= */
export const criarPagamento = async (req, res) => {
  try {
    const {
      id_produto,
      id_forma_pagamento,
      parcelas = [],
      status_pagamento
    } = req.body;

    if (!id_produto || !id_forma_pagamento) {
      return res.status(400).json({ erro: "Dados incompletos" });
    }

    // PRODUTO
    const produto = await db.query(
      "SELECT id, preco FROM produtos WHERE id = $1",
      [id_produto]
    );

    if (produto.rows.length === 0) {
      return res.status(404).json({ erro: "Produto não encontrado" });
    }

    const valor = Number(produto.rows[0].preco);

    // VENDA
    const venda = await db.query(
      `INSERT INTO vendas (id_usuario, data_venda)
       VALUES ($1, NOW())
       RETURNING id`,
      [req.user.id]
    );

    const id_venda = venda.rows[0].id;

    await db.query(
      `INSERT INTO itens_venda (id_venda, id_produto, quantidade)
       VALUES ($1, $2, $3)`,
      [id_venda, id_produto, 1]
    );

    // PAGAMENTO
    const pagamento = await db.query(
      `INSERT INTO pagamentos
       (id_venda, id_forma_pagamento, valor, status, data_pagamento)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [
        id_venda,
        id_forma_pagamento,
        valor,
        parcelas.length > 0 ? "pendente" : (status_pagamento || "pago")
      ]
    );

    const id_pagamento = pagamento.rows[0].id;

    // PARCELAS
    if (parcelas.length > 0) {
      for (const p of parcelas) {
        await db.query(
          `INSERT INTO parcelas
           (id_pagamento, numero_parcela, valor, data_vencimento, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            id_pagamento,
            p.numero,
            p.valor,
            p.data_vencimento,
            "pendente"
          ]
        );
      }
    }

    res.json({ sucesso: true });

  } catch (err) {
    console.error("ERRO CRIAR:", err);
    res.status(500).json({ erro: err.message });
  }
};

/* =========================
   LISTAR PAGAMENTOS
========================= */
export const listarPagamentosPorId = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        p.id,
        pr.nome AS nome_produto,
        p.valor,
        p.status,
        p.data_pagamento
      FROM pagamentos p
      JOIN vendas v ON v.id = p.id_venda
      JOIN itens_venda iv ON iv.id_venda = v.id
      JOIN produtos pr ON pr.id = iv.id_produto
      WHERE v.id_usuario = $1
      ORDER BY p.id DESC
    `, [req.user.id]);

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

/* =========================
   LISTAR PARCELAS
========================= */
export const listarParcelasPorPagamento = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT * FROM parcelas
       WHERE id_pagamento = $1
       ORDER BY numero_parcela`,
      [id]
    );

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};

/* =========================
   ATUALIZAR PARCELA
========================= */
export const atualizarParcela = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      `UPDATE parcelas SET status = $1 WHERE id = $2`,
      [req.body.status, id]
    );

    res.json({ sucesso: true });

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};
