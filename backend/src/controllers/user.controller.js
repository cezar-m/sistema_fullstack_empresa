import db from "../config/db.js";

export const listar = async(req, res) => {
	const result = await db.query("SELECT id, nome, email, acesso FROM usuarios");
	res.json(result.rows);
};

export const deletarVenda = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. parcelas ligadas aos pagamentos dessa venda
    await db.query(`
      DELETE FROM parcelas
      WHERE id_pagamento IN (
        SELECT id FROM pagamentos WHERE id_venda = $1
      )
    `, [id]);

    // 2. pagamentos da venda
    await db.query(
      "DELETE FROM pagamentos WHERE id_venda = $1",
      [id]
    );

    // 3. itens da venda
    await db.query(
      "DELETE FROM itens_venda WHERE id_venda = $1",
      [id]
    );

    // 4. venda principal
    await db.query(
      "DELETE FROM vendas WHERE id = $1",
      [id]
    );

    return res.json({ msg: "Venda deletada com sucesso!" });

  } catch (err) {
    console.error("ERRO DELETE VENDA:", err);

    return res.status(500).json({
      erro: err.message
    });
  }
};
