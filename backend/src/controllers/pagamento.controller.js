import db from "../config/db.js";

/* =========================
   CRIAR PAGAMENTO
========================= */
export const criarPagamento = async (req, res) => {
  try {
    console.log("BODY:", req.body);

    if (!req.user || !req.user.id) {
      return res.status(401).json({ erro: "Usuário não autenticado" });
    }

    let { id_produto, quantidade, id_forma_pagamento, parcelas } = req.body;

    // NORMALIZAÇÃO
    id_produto = parseInt(id_produto);
    quantidade = parseInt(quantidade) || 1;
    id_forma_pagamento = parseInt(id_forma_pagamento);
    parcelas = Array.isArray(parcelas) ? parcelas : [];

    // VALIDAÇÃO
    if (isNaN(id_produto) || isNaN(id_forma_pagamento)) {
      return res.status(400).json({ erro: "Dados incompletos" });
    }

    if (quantidade <= 0) {
      return res.status(400).json({ erro: "Quantidade inválida" });
    }

    // PRODUTO
    const produtoRes = await db.query(
      "SELECT id, nome, preco FROM produtos WHERE id=$1",
      [id_produto]
    );

    if (produtoRes.rows.length === 0) {
      return res.status(404).json({ erro: "Produto não encontrado" });
    }

    const produto = produtoRes.rows[0];
    const valor = Number(produto.preco) * quantidade;

    // FORMA PAGAMENTO
    const formaRes = await db.query(
      "SELECT id FROM formas_pagamento WHERE id=$1",
      [id_forma_pagamento]
    );

    if (formaRes.rows.length === 0) {
      return res.status(400).json({ erro: "Forma de pagamento inválida" });
    }

    // VENDA
    const vendaRes = await db.query(
      `INSERT INTO vendas (id_usuario, data_venda)
       VALUES ($1, NOW())
       RETURNING id`,
      [req.user.id]
    );

    const id_venda = vendaRes.rows[0].id;

    // ITEM VENDA
    await db.query(
      `INSERT INTO itens_venda (id_venda, id_produto, quantidade)
       VALUES ($1,$2,$3)`,
      [id_venda, id_produto, quantidade]
    );

    // PAGAMENTO
    const pagamentoRes = await db.query(
      `INSERT INTO pagamentos
       (id_venda, id_forma_pagamento, valor, status, data_pagamento)
       VALUES ($1,$2,$3,$4,NOW())
       RETURNING id`,
      [id_venda, id_forma_pagamento, valor, "pendente"]
    );

    const id_pagamento = pagamentoRes.rows[0].id;

    // PARCELAS
    for (const p of parcelas) {
      const numero = parseInt(p.numero);
      const valorParcela = Number(p.valor);
      const data = p.data_vencimento;

      if (isNaN(numero) || isNaN(valorParcela) || !data) continue;

      await db.query(
        `INSERT INTO parcelas
         (id_pagamento, numero_parcela, valor, data_vencimento, status)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          id_pagamento,
          numero,
          valorParcela,
          data,
          p.status || "pendente"
        ]
      );
    }

    return res.status(201).json({
      msg: "Pagamento criado com sucesso",
      id_pagamento
    });

  } catch (err) {
    console.error("ERRO:", err);
    return res.status(500).json({
      erro: "Erro interno",
      detalhe: err.message
    });
  }
};

/* =========================
   LISTAR PAGAMENTOS DO USUÁRIO
========================= */
export const listarPagamentosPorId = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ erro: "Não autenticado" });
    }

    const result = await db.query(
      `SELECT p.id, p.valor, p.status, p.data_pagamento
       FROM pagamentos p
       JOIN vendas v ON v.id = p.id_venda
       WHERE v.id_usuario = $1
       ORDER BY p.id DESC`,
      [req.user.id]
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
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ erro: "ID inválido" });
    }

    await db.query(
      `UPDATE pagamentos SET status='pago' WHERE id=$1`,
      [id]
    );

    await db.query(
      `UPDATE parcelas SET status='pago' WHERE id_pagamento=$1`,
      [id]
    );

    res.json({ msg: "Pagamento atualizado para pago" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao atualizar pagamento" });
  }
};

/* =========================
   LISTAR PARCELAS
========================= */
export const listarParcelasPorPagamento = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

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
    res.status(500).json({ erro: "Erro ao listar parcelas" });
  }
};

/* =========================
   ATUALIZAR PARCELA
========================= */
export const atualizarParcela = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ erro: "Status obrigatório" });
    }

    await db.query(
      `UPDATE parcelas SET status=$1 WHERE id=$2`,
      [status, id]
    );

    res.json({ msg: "Parcela atualizada com sucesso" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao atualizar parcela" });
  }
};
