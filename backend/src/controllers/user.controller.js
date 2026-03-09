import db from "../config/db.js";

export const listar = async(req, res) => {
	const [rows] = await db.query("SELECT id, nome, email, acesso FROM usuarios");
	res.json(rows)
};

export const deletar = async(req, res) => {
	await db.query("DELETE FROM usuarios WHERE id=?",[req.params.id]);
	res.json({msg:"Usuário excluido com sucesso!!!"})
}