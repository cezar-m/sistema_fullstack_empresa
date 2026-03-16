// controllers/formaPagamentoController.js
import db from "../config/db.js";

// Função que garante que o ativo será 0 ou 1
const parseAtivo = (valor) => {
  if (valor === 0 || valor === "0" || valor === false) return 0;
  return 1;
};

export const criarFormaPagamento = async (req, res) => {
  try {
    const { nome, ativo } = req.body;

    if (!nome?.trim()) return res.status(400).json({ erro: "Nome obrigatório" });

    const ativoNum = parseAtivo(ativo);

    const result = await db.query(
      "INSERT INTO formas_pagamento (nome, ativo) VALUES ($1, $2) RETURNING *",
      [nome.trim(), ativoNum]
    );

    res.json({ msg: "Forma de pagamento criada", forma: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao criar forma de pagamento" });
  }
};

export const atualizarFormaPagamento = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, ativo } = req.body;

    if (!nome?.trim()) return res.status(400).json({ erro: "Nome obrigatório" });

    const ativoNum = parseAtivo(ativo);

    const result = await db.query(
      "UPDATE formas_pagamento SET nome = $1, ativo = $2 WHERE id = $3 RETURNING *",
      [nome.trim(), ativoNum, id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ erro: "Forma de pagamento não encontrada" });

    res.json({ msg: "Forma de pagamento atualizada", forma: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao atualizar forma de pagamento" });
  }
};

export const listarFormas = async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM formas_pagamento ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao listar formas de pagamento" });
  }
};

export const excluirFormaPagamento = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      "DELETE FROM formas_pagamento WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ erro: "Forma de pagamento não encontrada" });

    res.json({ msg: "Forma de pagamento excluída", forma: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao excluir forma de pagamento" });
  }
};
