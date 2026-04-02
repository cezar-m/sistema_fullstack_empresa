import db from "../config/db.js";

export const listar = async (req, res) => {
  const result = await db.query(
    "SELECT id, nome, email, acesso FROM usuarios"
  );

  res.json(result.rows);
};

export const deletar = async (req, res) => {
  const client = await db.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    // =========================
    // 1. ITENS_VENDA (DEPENDÊNCIA MAIS INTERNA)
    // =========================

    // Por vendas do usuário
    await client.query(`
      DELETE FROM itens_venda 
      WHERE id_venda IN (
        SELECT id FROM vendas WHERE id_usuario = $1
      )
    `, [id]);

    // Por produtos do usuário
    await client.query(`
      DELETE FROM itens_venda 
      WHERE id_produto IN (
        SELECT id FROM produtos WHERE id_usuario = $1
      )
    `, [id]);

    // =========================
    // 2. PARCELAS
    // =========================
    await client.query(`
      DELETE FROM parcelas
      WHERE id_pagamento IN (
        SELECT id FROM pagamentos WHERE id_usuario = $1
      )
    `, [id]);

    // =========================
    // 3. PAGAMENTOS
    // =========================
    await client.query("DELETE FROM pagamentos WHERE id_usuario = $1", [id]);

    // =========================
    // 4. VENDAS
    // =========================
    await client.query("DELETE FROM vendas WHERE id_usuario = $1", [id]);

    // =========================
    // 5. PRODUTOS
    // =========================
    await client.query("DELETE FROM produtos WHERE id_usuario = $1", [id]);

    // =========================
    // 6. USUÁRIO
    // =========================
    await client.query("DELETE FROM usuarios WHERE id = $1", [id]);

    await client.query("COMMIT");

    return res.json({ msg: "Usuário deletado com sucesso!" });

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("🔥 ERRO AO DELETAR USUÁRIO:");
    console.error(err);

    return res.status(500).json({
      erro: err.message,
      detalhe: err.detail || null,
      tabela: err.table || null,
      constraint: err.constraint || null
    });

  } finally {
    client.release();
  }
};
