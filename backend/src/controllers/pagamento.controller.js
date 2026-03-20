import db from "../config/db.js";

/* =========================
   CRIAR PAGAMENTO
========================= */
export const criarPagamento = async (req, res) => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const {
      id_produto,
      id_forma_pagamento,
      parcelas = [],
      status_pagamento
    } = req.body;

    if (!id_produto || !id_forma_pagamento) {
      throw new Error("Dados incompletos");
    }

    const produto = await client.query(
      "SELECT id, preco FROM produtos WHERE id = $1",
      [id_produto]
    );

    if (produto.rows.length === 0) {
      throw new Error("Produto não encontrado");
    }

    const valor = Number(produto.rows[0].preco);

    const venda = await client.query(
      `INSERT INTO vendas (id_usuario, data_venda)
       VALUES ($1, NOW())
       RETURNING id`,
      [req.user.id]
    );

    const id_venda = venda.rows[0].id;

    await client.query(
      `INSERT INTO itens_venda (id_venda, id_produto, quantidade)
       VALUES ($1, $2, $3)`,
      [id_venda, id_produto, 1]
    );

    const pagamento = await client.query(
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

    // 🔥 CORREÇÃO DA SEQUENCE (BLINDAGEM)
    await client.query(`
      SELECT setval(
        'public.parcelas_id_seq'
        COALESCE((SELECT MAX(id) FROM parcelas), 1)
      )
    `);

    // 🔥 INSERT PARCELAS COM VALIDAÇÃO
    if (parcelas.length > 0) {
      for (const p of parcelas) {

        if (!p.numero || !p.valor || !p.data_vencimento) {
          throw new Error("Parcela inválida");
        }

        await client.query(
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

    await client.query("COMMIT");

    res.json({ sucesso: true });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ERRO CRIAR:", err);
    res.status(500).json({ erro: err.message });
  } finally {
    client.release();
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
   ATUALIZAR PAGAMENTO
========================= */
export const marcarComoPago = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      return res.status(400).json({ erro: "ID inválido" });
    }

    await db.query(
      `UPDATE pagamentos
       SET status = $1
       WHERE id = $2`,
      [status || "pago", id]
    );

    res.json({ sucesso: true });

  } catch (err) {
    console.error("ERRO UPDATE:", err);
    res.status(500).json({ erro: err.message });
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
      [status, id]
    );

    res.json({ sucesso: true });

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
};
