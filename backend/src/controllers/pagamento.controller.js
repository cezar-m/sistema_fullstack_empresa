import db from "../config/db.js";

/* =========================
   CRIAR PAGAMENTO (CORRIGIDO REAL)
========================= */
export const criarPagamento = async (req, res) => {
  try {
    console.log("BODY:", req.body);

    if (!req.user || !req.user.id) {
      return res.status(401).json({ erro: "Usuário não autenticado" });
    }

    let { id_produto, quantidade, id_forma_pagamento, parcelas } = req.body;

    /* =========================
       NORMALIZAÇÃO SEGURA
    ========================= */
    id_produto = parseInt(id_produto);
    id_forma_pagamento = parseInt(id_forma_pagamento);
    quantidade = parseInt(quantidade) || 1;
    parcelas = Array.isArray(parcelas) ? parcelas : [];

    /* =========================
       VALIDAÇÃO CORRETA (SEM BUG)
    ========================= */
    if (isNaN(id_produto) || isNaN(id_forma_pagamento)) {
      return res.status(400).json({
        erro: "id_produto ou id_forma_pagamento inválido"
      });
    }

    if (quantidade <= 0) {
      return res.status(400).json({
        erro: "Quantidade inválida"
      });
    }

    /* =========================
       PRODUTO
    ========================= */
    const produtoResult = await db.query(
      "SELECT id, nome, preco FROM produtos WHERE id=$1",
      [id_produto]
    );

    if (produtoResult.rows.length === 0) {
      return res.status(404).json({ erro: "Produto não encontrado" });
    }

    const produto = produtoResult.rows[0];
    const valor = Number(produto.preco) * quantidade;

    if (isNaN(valor)) {
      return res.status(400).json({ erro: "Erro ao calcular valor" });
    }

    /* =========================
       FORMA PAGAMENTO
    ========================= */
    const formaResult = await db.query(
      "SELECT id FROM formas_pagamento WHERE id=$1 AND ativo=true",
      [id_forma_pagamento]
    );

    if (formaResult.rows.length === 0) {
      return res.status(400).json({
        erro: "Forma de pagamento inválida ou inativa"
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
       PARCELAS (OPCIONAL)
    ========================= */
    if (parcelas.length > 0) {
      for (const p of parcelas) {
        const numero = parseInt(p.numero);
        const valorParcela = Number(p.valor);
        const data = p.data_vencimento;

        if (isNaN(numero) || isNaN(valorParcela) || !data) {
          console.log("Parcela ignorada:", p);
          continue;
        }

        await db.query(
          `INSERT INTO parcelas
           (id_pagamento, numero_parcela, valor, data_vencimento, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            id_pagamento,
            numero,
            valorParcela,
            data,
            p.status || "pendente"
          ]
        );
      }
    }

    return res.status(201).json({
      msg: "Pagamento criado com sucesso",
      id_pagamento
    });

  } catch (err) {
    console.error("ERRO REAL:", err);

    return res.status(500).json({
      erro: "Erro interno no servidor",
      detalhe: err.message
    });
  }
};
