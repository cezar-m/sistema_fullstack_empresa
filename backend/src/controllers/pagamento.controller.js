import db from "../config/db.js";

/* =========================
   CRIAR PAGAMENTO (CORRIGIDO)
========================= */
export const criarPagamento = async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("USER:", req.user);

    if (!req.user?.id) {
      return res.status(401).json({ erro: "Usuário não autenticado" });
    }

    const {
      id_produto,
      quantidade = 1,
      forma_pagamento,
      id_forma_pagamento,
      parcelas = []
    } = req.body;

    if (!id_produto || (!forma_pagamento && !id_forma_pagamento)) {
      return res.status(400).json({ erro: "Dados incompletos" });
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
    const valor = Number(produto.preco) * Number(quantidade);

    if (isNaN(valor)) {
      return res.status(400).json({ erro: "Valor inválido" });
    }

    /* =========================
       BUSCAR OU CRIAR VENDA
    ========================= */
    const vendaResult = await db.query(
      `SELECT v.id
       FROM vendas v
       JOIN itens_venda iv ON iv.id_venda = v.id
       WHERE iv.id_produto=$1 AND v.id_usuario=$2
       ORDER BY v.id DESC
       LIMIT 1`,
      [id_produto, req.user.id]
    );

    let id_venda;

    if (!vendaResult.rows.length) {
      const novaVenda = await db.query(
        `INSERT INTO vendas (id_usuario, data_venda)
         VALUES($1, NOW())
         RETURNING id`,
        [req.user.id]
      );

      id_venda = novaVenda.rows[0].id;

      await db.query(
        `INSERT INTO itens_venda (id_venda, id_produto, quantidade)
         VALUES($1, $2, $3)`,
        [id_venda, id_produto, quantidade]
      );
    } else {
      id_venda = vendaResult.rows[0].id;
    }

    /* =========================
       BUSCAR FORMA PAGAMENTO
    ========================= */
    let formaResult;

    if (id_forma_pagamento) {
      formaResult = await db.query(
        "SELECT id FROM formas_pagamento WHERE id=$1 AND ativo=true",
        [id_forma_pagamento]
      );
    } else {
      formaResult = await db.query(
        "SELECT id FROM formas_pagamento WHERE nome=$1 AND ativo=true",
        [forma_pagamento]
      );
    }

    if (!formaResult.rows.length) {
      return res.status(404).json({ erro: "Forma de pagamento inválida" });
    }

    const idForma = formaResult.rows[0].id;

    /* =========================
       EVITAR DUPLICADO
    ========================= */
    const pagamentoExistente = await db.query(
      "SELECT id FROM pagamentos WHERE id_venda=$1 AND id_forma_pagamento=$2",
      [id_venda, idForma]
    );

    if (pagamentoExistente.rows.length) {
      return res.status(400).json({
        erro: "Pagamento já existe para esta venda e forma"
      });
    }

    /* =========================
       INSERIR PAGAMENTO
    ========================= */
    const pagamentoResult = await db.query(
      `INSERT INTO pagamentos
       (id_venda, id_forma_pagamento, valor, status, data_pagamento)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [id_venda, idForma, valor, "pago"]
    );

    const id_pagamento = pagamentoResult.rows[0].id;

    /* =========================
       INSERIR PARCELAS (CORRIGIDO)
    ========================= */
    if (Array.isArray(parcelas) && parcelas.length > 0) {
      for (const p of parcelas) {
        if (!p.numero || !p.valor || !p.data_vencimento) continue;

        await db.query(
          `INSERT INTO parcelas
           (id_pagamento, numero_parcela, valor, data_vencimento, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            id_pagamento,
            p.numero,
            p.valor,
            p.data_vencimento,
            p.status || "pendente"
          ]
        );
      }
    }

    return res.json({
      msg: "Pagamento criado com sucesso",
      id_pagamento
    });

  } catch (err) {
    console.error("ERRO REAL:", err);
    return res.status(500).json({
      erro: "Erro interno",
      detalhe: err.message
    });
  }
};
