import db from "../config/db.js";

export const listar = async(req, res) => {
	const result = await db.query("SELECT id, nome, email, acesso FROM usuarios");
	res.json(result.rows);
};

export const deletar = async(req, res) => {
	await db.query("DELETE FROM usuarios WHERE id=$1",[req.params.id]);
	res.json({msg:"Usuário excluido com sucesso!!!"})
}
