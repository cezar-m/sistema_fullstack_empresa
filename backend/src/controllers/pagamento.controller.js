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

    // Cria pagamento
    const pagamento = await db.query(
      `INSERT INTO pagamentos (id_venda, id_forma_pagamento, valor, status)
       VALUES ($1, $2, $3, 'pendente')
       RETURNING *`,
      [id_venda, id_forma_pagamento, valor]
    );

    const pagamentoId = pagamento.rows[0].id;

    // Cria parcelas se existir tabela 'parcelas'
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
   LISTAR PAGAMENTOS
========================= */
export const listarPagamentos = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM pagamentos ORDER BY id DESC"
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao listar pagamentos" });
  }
};

/* =========================
   MARCAR COMO PAGO / ATUALIZAR STATUS
========================= */
export const atualizarStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ erro: "Status obrigatório" });

    await db.query(
      "UPDATE pagamentos SET status = $1 WHERE id = $2",
      [status, id]
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
export const listarParcelas = async (req, res) => {
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
