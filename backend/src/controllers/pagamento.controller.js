import db from "../config/db.js";

/* =========================
   CRIAR PAGAMENTO
========================= */
export const criarPagamento = async (req, res) => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const { ids_vendas, parcelas = [] } = req.body;

    if (!Array.isArray(ids_vendas) || ids_vendas.length === 0) {
      throw new Error("Nenhuma venda enviada");
    }

    let total = 0;
    const pagamentos = [];

    for (const id_venda of ids_vendas) {

      const venda = await client.query(
        `SELECT total, pago FROM vendas WHERE id=$1 FOR UPDATE`,
        [id_venda]
      );

      if (!venda.rows.length) {
        throw new Error(`Venda ${id_venda} não existe`);
      }

      if (venda.rows[0].pago) {
        throw new Error(`Venda ${id_venda} já paga`);
      }

      const valorVenda = Number(venda.rows[0].total) || 0;
      total += valorVenda;

      const pagamento = await client.query(
        `INSERT INTO pagamentos (id_venda, valor, status)
         VALUES ($1,$2,'pendente')
         RETURNING id`,
        [id_venda, valorVenda]
      );

      const id_pagamento = pagamento.rows[0].id;
      pagamentos.push(id_pagamento);

      // 🔥 NÃO marcar venda como paga aqui

      // criar parcelas se existirem
      if (parcelas.length > 0) {
        for (const p of parcelas) {
          await client.query(
            `INSERT INTO parcelas 
             (id_pagamento, numero_parcela, valor, data_vencimento, status)
             VALUES ($1,$2,$3,$4,'pendente')`,
            [
              id_pagamento,
              p.numero,
              Number(p.valor) || 0,
              String(p.data_vencimento).split("T")[0]
            ]
          );
        }
      } else {
        // 🔥 pagamento à vista → já pago
        await client.query(
          `UPDATE pagamentos SET status='pago' WHERE id=$1`,
          [id_pagamento]
        );

        await client.query(
          `UPDATE vendas SET pago=true WHERE id=$1`,
          [id_venda]
        );
      }
    }

    await client.query("COMMIT");

    res.json({
      sucesso: true,
      total,
      pagamentos
    });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ erro: err.message });
  } finally {
    client.release();
  }
};


/* =========================
   MARCAR COMO PAGO (CORRIGIDO)
========================= */
export const marcarComoPago = async (req, res) => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const { id } = req.params;

    const status = String(req.body?.status || "")
      .toLowerCase()
      .trim();

    if (status !== "pago" && status !== "pendente") {
      throw new Error("Status inválido");
    }

    const pag = await client.query(
      `SELECT id_venda FROM pagamentos WHERE id=$1`,
      [id]
    );

    if (!pag.rows.length) {
      throw new Error("Pagamento não encontrado");
    }

    const id_venda = pag.rows[0].id_venda;

    await client.query(
      `UPDATE pagamentos SET status=$1 WHERE id=$2`,
      [status, id]
    );

    await client.query(
      `UPDATE vendas SET pago=$1 WHERE id=$2`,
      [status === "pago", id_venda]
    );

    await client.query("COMMIT");

    res.json({ sucesso: true });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ erro: err.message });
  } finally {
    client.release();
  }
};


/* =========================
   LISTAR PAGAMENTOS
========================= */
export const listarPagamentosPorId = async (req, res) => {
  try {
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
               'quantidade', iv.quantidade
             )
           ) FILTER (WHERE iv.id IS NOT NULL),
           '[]'
         ) AS itens
       FROM pagamentos p
       LEFT JOIN vendas v ON v.id = p.id_venda
       LEFT JOIN itens_venda iv ON iv.id_venda = v.id
       LEFT JOIN produtos pr ON pr.id = iv.id_produto
       WHERE v.id_usuario=$1
       GROUP BY p.id
       ORDER BY p.id DESC`,
      [req.user.id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("ERRO LISTAR PAGAMENTOS:", err);
    res.status(400).json({ erro: err.message });
  }
};


/* =========================
   LISTAR PARCELAS
========================= */
export const listarParcelasPorPagamento = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        id,
        numero_parcela,
        valor,
        status,
        data_vencimento
      FROM parcelas
      WHERE id_pagamento = $1
      ORDER BY numero_parcela ASC`,
      [req.params.id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("ERRO LISTAR PARCELAS:", err);
    res.status(400).json({ erro: err.message });
  }
};


/* =========================
   ATUALIZAR PARCELA (INTELIGENTE)
========================= */
export const atualizarParcelas = async (req, res) => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const id = Number(req.params.id);

    const status = String(req.body?.status || "")
      .toLowerCase()
      .trim();

    if (!id || isNaN(id)) {
      throw new Error("ID inválido");
    }

    if (status !== "pago" && status !== "pendente") {
      throw new Error("Status inválido");
    }

    const parcela = await client.query(
      `UPDATE parcelas
       SET status = $1
       WHERE id = $2
       RETURNING id_pagamento`,
      [status, id]
    );

    if (!parcela.rowCount) {
      throw new Error("Parcela não encontrada");
    }

    const id_pagamento = parcela.rows[0].id_pagamento;

    // 🔥 verificar se todas estão pagas
    const check = await client.query(
      `SELECT COUNT(*) FILTER (WHERE status='pendente') AS pendentes
       FROM parcelas
       WHERE id_pagamento=$1`,
      [id_pagamento]
    );

    const pendentes = Number(check.rows[0].pendentes);

    if (pendentes === 0) {
      await client.query(
        `UPDATE pagamentos SET status='pago' WHERE id=$1`,
        [id_pagamento]
      );

      await client.query(
        `UPDATE vendas SET pago=true
         WHERE id = (SELECT id_venda FROM pagamentos WHERE id=$1)`,
        [id_pagamento]
      );
    } else {
      await client.query(
        `UPDATE pagamentos SET status='pendente' WHERE id=$1`,
        [id_pagamento]
      );
    }

    await client.query("COMMIT");

    res.json({ sucesso: true });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ erro: err.message });
  } finally {
    client.release();
  }
};
