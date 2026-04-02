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

    // 1. parcelas
    await client.query("DELETE FROM parcelas WHERE id_usuario = $1", [id]);

    // 2. pagamentos
    await client.query("DELETE FROM pagamentos WHERE id_usuario = $1", [id]);

    // 3. itens_venda (ANTES de vendas e produtos)
    await client.query(`
      DELETE FROM itens_venda 
      WHERE id_venda IN (
        SELECT id FROM vendas WHERE id_usuario = $1
      )
    `, [id]);

    // 4. vendas
    await client.query("DELETE FROM vendas WHERE id_usuario = $1", [id]);

    // 5. produtos
    await client.query("DELETE FROM produtos WHERE id_usuario = $1", [id]);

    // 6. usuário
    await client.query("DELETE FROM usuarios WHERE id = $1", [id]);

    await client.query("COMMIT");

    return res.json({ msg: "Usuário deletado com sucesso!" });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({ erro: err.message });
  } finally {
    client.release();
  }
};

