import db from "../config/db.js";

/* =========================
   CRIAR PAGAMENTO
========================= */
export const criarPagamento = async (req, res) => {
  try {
    const { id_venda, id_forma_pagamento, valor, parcelas } = req.body;

    if (!id_venda || !id_forma_pagamento || !valor) {
      return res.status(400).json({ erro: "Dados obrigatórios" });
    }

    const pagamento = await db.query(
      `INSERT INTO pagamentos (id_venda, id_forma_pagamento, valor, status)
       VALUES ($1, $2, $3, 'pendente')
       RETURNING *`,
      [id_venda, id_forma_pagamento, valor]
    );

    const pagamentoId = pagamento.rows[0].id;

    // Criar parcelas se existir
    if (parcelas && parcelas.length > 0) {
      for (let p of parcelas) {
        if (!p.valor || !p.data_vencimento) continue;

        await db.query(
          `INSERT INTO parcelas (id_pagamento, numero, valor, data_vencimento, status)
           VALUES ($1, $2, $3, $4, 'pendente')`,
          [pagamentoId, p.numero, p.valor, p.data_vencimento]
        );
      }
    }

    res.json({ sucesso: true, pagamento: pagamento.rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao criar pagamento" });
  }
};

/* =========================
   LISTAR PAGAMENTOS POR ID DE USUARIO
========================= */
export const listarPagamentosPorId = async (req, res) => {
  try {
    const id_usuario = req.user.id;

    const result = await db.query(
      `SELECT p.*, pr.nome AS nome_produto
       FROM pagamentos p
       LEFT JOIN produtos pr ON pr.id = p.id_venda
       WHERE p.id_usuario = $1
       ORDER BY p.id DESC`,
      [id_usuario]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao listar pagamentos" });
  }
};

/* =========================
   MARCAR COMO PAGO
========================= */
export const marcarComoPago = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      "UPDATE pagamentos SET status = 'pago' WHERE id = $1",
      [id]
    );

    res.json({ sucesso: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao atualizar status" });
  }
};

/* =========================
   LISTAR PARCELAS DE UM PAGAMENTO
========================= */
export const listarParcelasPorPagamento = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "SELECT * FROM parcelas WHERE id_pagamento = $1 ORDER BY numero",
      [id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao listar parcelas" });
  }
};

/* =========================
   ATUALIZAR PARCELA
========================= */
export const atualizarParcela = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ erro: "Status obrigatório" });

    await db.query(
      "UPDATE parcelas SET status = $1 WHERE id = $2",
      [status, id]
    );

    res.json({ sucesso: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao atualizar parcela" });
  }
};
