import db from "../config/db.js";

/* =========================
   CRIAR CATEGORIA
========================= */
export const criar = async (req, res) => {
  try {
    const { nome } = req.body;

    if (!nome) return res.status(400).json({ erro: "Nome obrigatório" });

    const query = "INSERT INTO categorias (nome) VALUES ($1) RETURNING *";
    const result = await db.query(query, [nome]);

    res.json({ msg: "Categoria criada com sucesso", categoria: result.rows[0] });
  } catch (err) {
    console.error("Erro criar categoria:", err.message || err);
    res.status(500).json({ erro: "Erro ao criar categoria" });
  }
};

/* =========================
   LISTAR CATEGORIAS
========================= */
export const listar = async (req, res) => {
  try {
    const query = "SELECT * FROM categorias ORDER BY nome ASC";
    const result = await db.query(query);

    res.json(result.rows);
  } catch (err) {
    console.error("Erro listar categorias:", err.message || err);
    res.status(500).json({ erro: "Erro ao listar categorias" });
  }
};

/* =========================
   ATUALIZAR CATEGORIA
========================= */
export const atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;

    if (!nome) return res.status(400).json({ erro: "Nome obrigatório" });

    const query = "UPDATE categorias SET nome=$1 WHERE id=$2 RETURNING *";
    const result = await db.query(query, [nome, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ erro: "Categoria não encontrada" });
    }

    res.json({ msg: "Categoria atualizada", categoria: result.rows[0] });
  } catch (err) {
    console.error("Erro atualizar categoria:", err.message || err);
    res.status(500).json({ erro: "Erro ao atualizar categoria" });
  }
};

/* =========================
   DELETAR CATEGORIA
========================= */
export const deletar = async (req, res) => {
  try {
    const { id } = req.params;

    const query = "DELETE FROM categorias WHERE id=$1 RETURNING *";
    const result = await db.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ erro: "Categoria não encontrada" });
    }

    res.json({ msg: "Categoria deletada", categoria: result.rows[0] });
  } catch (err) {
    console.error("Erro deletar categoria:", err.message || err);
    res.status(500).json({ erro: "Erro ao deletar categoria" });
  }
};
