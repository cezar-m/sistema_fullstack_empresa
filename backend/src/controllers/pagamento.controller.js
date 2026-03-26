import db from "../config/db.js";

/* =========================
   CRIAR PAGAMENTO E VENDA
========================= */
export const criarPagamento = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const id_usuario = req.user?.id;
    if (!id_usuario) throw new Error("Usuário não autenticado");

    const { itens, id_forma_pagamento, parcelas } = req.body;
    if (!itens || itens.length === 0) throw new Error("Itens não informados");
    if (!id_forma_pagamento) throw new Error("Forma de pagamento não informada");

    // Cria venda
    const resultVenda = await client.query(
      `INSERT INTO vendas (id_usuario) VALUES ($1) RETURNING id`,
      [id_usuario]
    );
    const id_venda = resultVenda.rows[0].id;

    // Cria itens da venda
    for (let item of itens) {
      await client.query(
        `INSERT INTO itens_venda (id_venda, id_produto, quantidade, quantidade_paga) VALUES ($1, $2, $3, 0)`,
        [id_venda, item.id_produto, item.quantidade]
      );
    }

    // Cria pagamento
    const valorTotal = itens.reduce((acc, i) => acc + i.quantidade * i.preco, 0);
    const resultPagamento = await client.query(
      `INSERT INTO pagamentos (id_venda, id_forma_pagamento, valor, status) VALUES ($1, $2, $3, 'pendente') RETURNING id`,
      [id_venda, id_forma_pagamento, valorTotal]
    );
    const id_pagamento = resultPagamento.rows[0].id;

    // Cria parcelas
    if (parcelas && parcelas.length > 0) {
      for (let p of parcelas) {
        await client.query(
          `INSERT INTO parcelas (id_pagamento, numero_parcela, valor, data_vencimento, status)
           VALUES ($1, $2, $3, $4, 'pendente')`,
          [id_pagamento, p.numero, p.valor, p.data_vencimento]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ id_pagamento });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ erro: err.message });
  } finally {
    client.release();
  }
};

/* =========================
   LISTAR PAGAMENTOS DO USUÁRIO
========================= */
export const listarPagamentosPorId = async (req, res) => {
  try {
    const id_usuario = req.user.id;
    const result = await db.query(
      `SELECT 
         p.id,
         p.valor,
         p.status,
         p.data_pagamento,
         COALESCE(
           json_agg(
             json_build_object(
               'produto', pr.nome,
               'quantidade', iv.quantidade,
               'quantidade_paga', iv.quantidade_paga
             )
           ) FILTER (WHERE iv.id IS NOT NULL),
           '[]'
         ) AS itens
       FROM pagamentos p
       JOIN vendas v ON v.id = p.id_venda
       LEFT JOIN itens_venda iv ON iv.id_venda = v.id
       LEFT JOIN produtos pr ON pr.id = iv.id_produto
       WHERE v.id_usuario = $1
       GROUP BY p.id
       ORDER BY p.id DESC`,
      [id_usuario]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(400).json({ erro: err.message });
  }
};

/* =========================
   LISTAR PARCELAS DE UM PAGAMENTO
========================= */
export const listarParcelasPorPagamento = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT id, numero_parcela, valor, data_vencimento, status
       FROM parcelas
       WHERE id_pagamento = $1
       ORDER BY numero_parcela`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(400).json({ erro: err.message });
  }
};

/* =========================
   ATUALIZAR PARCELA OU PAGAMENTO (MARCAR COMO PAGO)
========================= */
export const atualizarParcelas = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { id } = req.params;
    const { status } = req.body;

    // Atualiza parcela se status enviado
    if (status) {
      await client.query(
        `UPDATE parcelas SET status=$1 WHERE id=$2`,
        [status, id]
      );

      // Atualiza quantidade_paga na tabela de itens_venda
      const { rows: pagamento } = await client.query(
        `SELECT id_venda FROM pagamentos WHERE id = $1`,
        [id]
      );
      const id_venda = pagamento[0].id_venda;

      const { rows: itens } = await client.query(
        `SELECT id, id_produto, quantidade, quantidade_paga
         FROM itens_venda
         WHERE id_venda = $1`,
        [id_venda]
      );

      for (let i of itens) {
        const quantidadeRestante = i.quantidade - i.quantidade_paga;
        if (quantidadeRestante > 0) {
          await client.query(
            `UPDATE itens_venda
             SET quantidade_paga = quantidade
             WHERE id = $1`,
            [i.id]
          );

          await client.query(
            `UPDATE produtos
             SET quantidade = quantidade - $1
             WHERE id = $2`,
            [quantidadeRestante, i.id_produto]
          );
        }
      }

      // Atualiza status do pagamento se todas as parcelas pagas
      const { rows: parcelas } = await client.query(
        `SELECT COUNT(*) FILTER (WHERE status != 'pago') AS pendentes
         FROM parcelas
         WHERE id_pagamento = $1`,
        [id]
      );

      if (parcelas[0].pendentes === "0") {
        await client.query(
          `UPDATE pagamentos SET status='pago' WHERE id=$1`,
          [id]
        );
      }
    }

    await client.query("COMMIT");
    res.json({ sucesso: true });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(400).json({ erro: err.message });
  } finally {
    client.release();
  }
};
