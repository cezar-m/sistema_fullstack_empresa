import db from "../config/db.js";

export default async function validateProduct(req, res, next) {
	try {
		const { id } = req.params;
		const result = await db.query(
			"SELECT * FROM produtos WHERE id=$1",
			[id]
		);
		if(result.rows.length === 0){
			return res.status(404).json({ erro: "Produto não encontrado" });
		}
		req.produto = result.rows[0];
		next();
	} catch(err) {
		console.error(err);
		res.status(500).json({ erro: "Erro no middleware de validação" });
	}
}
