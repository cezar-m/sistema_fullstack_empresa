import db from "../config/db.js";

/* =========================
   CRIAR PAGAMENTO (FINAL)
========================= */
export const criarPagamento = async (req, res) => {
  try {
    console.log("BODY:", req.body);

    if (!req.user?.id) {
      return res.status(401).json({ erro: "Usuário não autenticado" });
    }

    let {
      id_produto,
      quantidade,
      id_forma_pagamento,
      parcelas
    } = req.body;

    // NORMALIZAÇÃO
    id_produto = Number(id_produto);
    quantidade = Number(quantidade || 1);
    id_forma_pagamento = Number(id_forma_pagamento);
    parcelas = Array.isArray(parcelas) ? parcelas : [];

    /* =========================
       VALIDAÇÃO FORTE
    ========================= */
    if (!id_produto || !id_forma_pagamento) {
      return res.status(400).json({
        erro: "id_produto e id_forma_pagamento são obrigatórios"
      });
    }

    if (quantidade <= 0) {
      return res.status(400).json({
        erro: "Quantidade inválida"
      });
    }

    /* =========================
       BUSCAR PRODUTO
    ========================= */
    const produtoResult = await db.query(
      "SELECT id, nome, preco FROM produtos WHERE id=$1",
      [id_produto]
    );

    if (!produtoResult.rows.length) {
      return res.status(404).json({ erro: "Produto não encontrado" });
    }

    const produto = produtoResult.rows[0];
    const valor = Number(produto.preco) * quantidade;

    /* =========================
       BUSCAR FORMA PAGAMENTO
    ========================= */
    const formaResult = await db.query(
      "SELECT id, nome FROM formas_pagamento WHERE id=$1 AND ativo=true",
      [id_forma_pagamento]
    );

    if (!formaResult.rows.length) {
      return res.status(404).json({
        erro: "Forma de pagamento inválida"
      });
    }

    /* =========================
       CRIAR VENDA
    ========================= */
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
      [id_venda, id_produto, quantidade]
    );

    /* =========================
       CRIAR PAGAMENTO
    ========================= */
    const pagamento = await db.query(
      `INSERT INTO pagamentos
       (id_venda, id_forma_pagamento, valor, status, data_pagamento)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [id_venda, id_forma_pagamento, valor, "pago"]
    );

    const id_pagamento = pagamento.rows[0].id;

    /* =========================
       CRIAR PARCELAS
    ========================= */
    if (parcelas.length > 0) {
      for (const p of parcelas) {
        if (!p.numero || p.valor == null || !p.data_vencimento) continue;

        await db.query(
          `INSERT INTO parcelas
           (id_pagamento, numero_parcela, valor, data_vencimento, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            id_pagamento,
            Number(p.numero),
            Number(p.valor),
            p.data_vencimento,
            p.status || "pendente"
          ]
        );
      }
    }

    return res.json({
      msg: "Pagamento criado",
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
