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
    // 1. ITENS_VENDA
    // =========================
    await client.query(`
      DELETE FROM itens_venda 
      WHERE id_venda IN (
        SELECT id FROM vendas WHERE id_usuario = $1
      )
    `, [id]);

    await client.query(`
      DELETE FROM itens_venda 
      WHERE id_produto IN (
        SELECT id FROM produtos WHERE id_usuario = $1
      )
    `, [id]);

    // =========================
    // 2. PARCELAS (via pagamentos)
    // =========================
    await client.query(`
      DELETE FROM parcelas
      WHERE id_pagamento IN (
        SELECT p.id
        FROM pagamentos p
        JOIN vendas v ON p.id_venda = v.id
        WHERE v.id_usuario = $1
      )
    `, [id]);

    // =========================
    // 3. PAGAMENTOS (via vendas)
    // =========================
    await client.query(`
      DELETE FROM pagamentos
      WHERE id_venda IN (
        SELECT id FROM vendas WHERE id_usuario = $1
      )
    `, [id]);

    // =========================
    // 4. VENDAS
    // =========================
    await client.query(`
      DELETE FROM vendas WHERE id_usuario = $1
    `, [id]);

    // =========================
    // 5. PRODUTOS
    // =========================
    await client.query(`
      DELETE FROM produtos WHERE id_usuario = $1
    `, [id]);

    // =========================
    // 6. USUARIO
    // =========================
    await client.query(`
      DELETE FROM usuarios WHERE id = $1
    `, [id]);

    await client.query("COMMIT");

    return res.json({ msg: "Usuário deletado com sucesso!" });

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("ERRO REAL:", err);

    return res.status(500).json({
      erro: err.message,
      tabela: err.table,
      constraint: err.constraint
    });

  } finally {
    client.release();
  }
};
