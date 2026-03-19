import db from "../config/db.js";

/* =========================
   CRIAR PAGAMENTO
========================= */
export const criarPagamento = async (req, res) => {
  try {
    const { nome_produto, forma_pagamento, parcelas, status_pagamento } = req.body;

    if (!nome_produto || !forma_pagamento) {
      return res.status(400).json({ erro: "Dados incompletos" });
    }

    // PRODUTO
    const produto = await db.query(
      "SELECT id, preco FROM produtos WHERE nome = $1",
      [nome_produto]
    );

    if (produto.rows.length === 0) {
      return res.status(404).json({ erro: "Produto não encontrado" });
    }

    const id_produto = produto.rows[0].id;
    const valor = produto.rows[0].preco;

    // VENDA
    const venda = await db.query(
      `SELECT v.id
       FROM vendas v
       JOIN itens_venda iv ON iv.id_venda = v.id
       WHERE iv.id_produto = $1 AND v.id_usuario = $2
       ORDER BY v.id DESC
       LIMIT 1`,
      [id_produto, req.user.id]
    );

    let id_venda;

    if (venda.rows.length === 0) {
      const novaVenda = await db.query(
        `INSERT INTO vendas (id_usuario, data_venda)
         VALUES ($1, NOW())
         RETURNING id`,
        [req.user.id]
      );

      id_venda = novaVenda.rows[0].id;

      await db.query(
        `INSERT INTO itens_venda (id_venda, id_produto, quantidade)
         VALUES ($1, $2, $3)`,
        [id_venda, id_produto, 1]
      );
    } else {
      id_venda = venda.rows[0].id;
    }

    // FORMA PAGAMENTO
    const forma = await db.query(
      "SELECT id FROM formas_pagamento WHERE nome = $1 AND ativo = true",
      [forma_pagamento]
    );

    if (forma.rows.length === 0) {
      return res.status(404).json({ erro: "Forma inválida" });
    }

    const id_forma_pagamento = forma.rows[0].id;

    // PAGAMENTO
    const pagamento = await db.query(
      `INSERT INTO pagamentos
       (id_venda, id_forma_pagamento, valor, status, data_pagamento)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [id_venda, id_forma_pagamento, valor, status_pagamento || "pago"]
    );

    const id_pagamento = pagamento.rows[0].id;

    // PARCELAS
    if (parcelas && parcelas.length > 0) {
      for (const p of parcelas) {
        await db.query(
          `INSERT INTO parcelas
           (id_pagamento, numero_parcela, valor, data_vencimento, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [id_pagamento, p.numero, p.valor, p.data_vencimento, "pendente"]
        );
      }
    }

    res.json({ sucesso: true, id_pagamento });

  } catch (err) {
    console.error("ERRO CRIAR:", err);
    res.status(500).json({ erro: "Erro ao criar pagamento" });
  }
};

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
    console.error("ERRO REAL:", err);
    res.status(500).json({ erro: err.message });
  }
};


/* =========================
   MARCAR COMO PAGO
========================= */
export const marcarComoPago = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      `UPDATE pagamentos
       SET status = $1
       WHERE id = $2`,
      [req.body.status || "pago", id]
    );

    res.json({ sucesso: true });

  } catch (err) {
    console.error("ERRO UPDATE:", err);
    res.status(500).json({ erro: "Erro ao atualizar pagamento" });
  }
};

/* =========================
   PARCELAS
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
    console.error("ERRO PARCELAS:", err);
    res.status(500).json({ erro: "Erro ao buscar parcelas" });
  }
};

export const atualizarParcela = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await db.query(
      `UPDATE parcelas SET status = $1 WHERE id = $2`,
      [status, id]
    );

    res.json({ sucesso: true });

  } catch (err) {
    console.error("ERRO UPDATE PARCELA:", err);
    res.status(500).json({ erro: "Erro ao atualizar parcela" });
  }
};
