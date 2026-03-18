import db from "../config/db.js";

/* =========================
   CRIAR PAGAMENTO (FINAL REAL)
========================= */
export const criarPagamento = async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("USER:", req.user);

    /* =========================
       AUTENTICAÇÃO
    ========================= */
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        erro: "Usuário não autenticado"
      });
    }

    /* =========================
       DADOS
    ========================= */
    let {
      id_produto,
      quantidade,
      id_forma_pagamento,
      parcelas
    } = req.body;

    // NORMALIZAÇÃO SEGURA
    id_produto = Number(id_produto);
    id_forma_pagamento = Number(id_forma_pagamento);
    quantidade = Number(quantidade) || 1;
    parcelas = Array.isArray(parcelas) ? parcelas : [];

    /* =========================
       VALIDAÇÃO (SEM BUG)
    ========================= */
    if (!id_produto || !id_forma_pagamento) {
      return res.status(400).json({
        erro: "Selecione produto e forma de pagamento"
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
      "SELECT id, nome, preco FROM produtos WHERE id = $1",
      [id_produto]
    );

    if (produtoResult.rows.length === 0) {
      return res.status(404).json({
        erro: "Produto não encontrado"
      });
    }

    const produto = produtoResult.rows[0];

    const valor = Number(produto.preco) * quantidade;

    if (isNaN(valor)) {
      return res.status(400).json({
        erro: "Erro ao calcular valor"
      });
    }

    /* =========================
       FORMA DE PAGAMENTO
    ========================= */
    const formaResult = await db.query(
      "SELECT id FROM formas_pagamento WHERE id = $1 AND ativo = true",
      [id_forma_pagamento]
    );

    if (formaResult.rows.length === 0) {
      return res.status(400).json({
        erro: "Forma de pagamento inválida"
      });
    }

    /* =========================
       CRIAR VENDA
    ========================= */
    const vendaResult = await db.query(
      `INSERT INTO vendas (id_usuario, data_venda)
       VALUES ($1, NOW())
       RETURNING id`,
      [req.user.id]
    );

    const id_venda = vendaResult.rows[0].id;

    await db.query(
      `INSERT INTO itens_venda (id_venda, id_produto, quantidade)
       VALUES ($1, $2, $3)`,
      [id_venda, id_produto, quantidade]
    );

    /* =========================
       CRIAR PAGAMENTO
    ========================= */
    const pagamentoResult = await db.query(
      `INSERT INTO pagamentos
       (id_venda, id_forma_pagamento, valor, status, data_pagamento)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [id_venda, id_forma_pagamento, valor, "pago"]
    );

    const id_pagamento = pagamentoResult.rows[0].id;

    /* =========================
       PARCELAS (OPCIONAL)
    ========================= */
    if (parcelas.length > 0) {
      for (const p of parcelas) {

        const numero = Number(p.numero);
        const valorParcela = Number(p.valor);
        const data = p.data_vencimento;

        // IGNORA inválidas sem quebrar
        if (!numero || !valorParcela || !data) {
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

    /* =========================
       RESPOSTA
    ========================= */
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
