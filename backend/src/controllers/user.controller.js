import db from "../config/db.js";

export const listar = async (req, res) => {
  const result = await db.query(
    "SELECT id, nome, email, acesso FROM usuarios"
  );

  res.json(result.rows);
};

export const deletar = async (req, res) => {
  try {
    const { id } = req.params;

    // remove dependências do usuário
    await db.query("DELETE FROM produtos WHERE id_usuario = $1", [id]);
    await db.query("DELETE FROM vendas WHERE id_usuario = $1", [id]);
    await db.query("DELETE FROM pagamentos WHERE id_usuario = $1", [id]);
    await db.query("DELETE FROM parcelas WHERE id_usuario = $1", [id]);

    // por último usuário
    await db.query("DELETE FROM usuarios WHERE id = $1", [id]);

    return res.json({ msg: "Usuário deletado com sucesso!" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ erro: err.message });
  }
};
