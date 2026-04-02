import db from "../config/db.js";

export const listar = async(req, res) => {
	const result = await db.query("SELECT id, nome, email, acesso FROM usuarios");
	res.json(result.rows);
};

export const deletar = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. apaga estoque ligado ao usuário
    await db.query(
      "DELETE FROM estoque WHERE id_usuario = $1",
      [id]
    );

    // 2. apaga vendas (se existir no seu sistema)
    await db.query(
      "DELETE FROM vendas WHERE id_usuario = $1",
      [id]
    );

    // 3. apaga produtos do usuário
    await db.query(
      "DELETE FROM produtos WHERE id_usuario = $1",
      [id]
    );

    // 4. apaga pagamentos (se existir)
    await db.query(
      "DELETE FROM pagamentos WHERE id_usuario = $1",
      [id]
    );

    // 5. por último apaga o usuário
    const result = await db.query(
      "DELETE FROM usuarios WHERE id = $1",
      [id]
    );

    return res.json({
      msg: "Usuário e dependências excluídos com sucesso!"
    });

  } catch (err) {
    console.error("ERRO AO DELETAR USUÁRIO:", err);

    return res.status(500).json({
      erro: "Erro ao excluir usuário",
      detalhe: err.message
    });
  }
};

