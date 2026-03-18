import db from "../config/db.js";

/* =========================
   CRIAR PAGAMENTO
========================= */
export const criarPagamento = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ erro: "Não autenticado" });
    }

    let { id_produto, quantidade, id_forma_pagamento, parcelas } = req.body;

    id_produto = Number(id_produto);
    id_forma_pagamento = Number(id_forma_pagamento);
    quantidade = Number(quantidade) || 1;
    parcelas = Array.isArray(parcelas) ? parcelas : [];

    if (!id_produto || !id_forma_pagamento) {
      return res.status(400).json({ erro: "Selecione produto e forma" });
    }

    const produto = await db.query(
      "SELECT * FROM produtos WHERE id=$1",
      [id_produto]
    );

    if (!produto.rows.length) {
      return res.status(404).json({ erro: "Produto não encontrado" });
    }

    const valor = Number(produto.rows[0].preco) * quantidade;

    const forma = await db.query(
      "SELECT * FROM formas_pagamento WHERE id=$1 AND ativo=true",
      [id_forma_pagamento]
    );

    if (!forma.rows.length) {
      return res.status(400).json({ erro: "Forma inválida" });
    }

    const venda = await db.query(
      "INSERT INTO vendas (id_usuario, data_venda) VALUES ($1, NOW()) RETURNING id",
      [req.user.id]
    );

    const id_venda = venda.rows[0].id;

    await db.query(
      "INSERT INTO itens_venda (id_venda, id_produto, quantidade) VALUES ($1,$2,$3)",
      [id_venda, id_produto, quantidade]
    );

    const pagamento = await db.query(
      `INSERT INTO pagamentos 
       (id_venda, id_forma_pagamento, valor, status, data_pagamento)
       VALUES ($1,$2,$3,'pendente',NOW()) RETURNING id`,
      [id_venda, id_forma_pagamento, valor]
    );

    const id_pagamento = pagamento.rows[0].id;

    for (const p of parcelas) {
      if (!p.numero || !p.valor || !p.data_vencimento) continue;

      await db.query(
        `INSERT INTO parcelas 
        (id_pagamento, numero_parcela, valor, data_vencimento, status)
        VALUES ($1,$2,$3,$4,'pendente')`,
        [id_pagamento, p.numero, p.valor, p.data_vencimento]
      );
    }

    res.json({ msg: "OK", id_pagamento });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
};

/* =========================
   LISTAR PAGAMENTOS
========================= */
export const listarPagamentos = async (req, res) => {
  const result = await db.query(`
    SELECT p.*, pr.nome as nome_produto, f.nome as forma
    FROM pagamentos p
    JOIN vendas v ON v.id = p.id_venda
    JOIN itens_venda iv ON iv.id_venda = v.id
    JOIN produtos pr ON pr.id = iv.id_produto
    JOIN formas_pagamento f ON f.id = p.id_forma_pagamento
    ORDER BY p.id DESC
  `);

  res.json(result.rows);
};

/* =========================
   ATUALIZAR PAGAMENTO
========================= */
export const atualizarPagamento = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  await db.query(
    "UPDATE pagamentos SET status=$1 WHERE id=$2",
    [status, id]
  );

  res.json({ msg: "Atualizado" });
};

/* =========================
   LISTAR PARCELAS
========================= */
export const listarParcelas = async (req, res) => {
  const { id } = req.params;

  const result = await db.query(
    "SELECT * FROM parcelas WHERE id_pagamento=$1",
    [id]
  );

  res.json(result.rows);
};
