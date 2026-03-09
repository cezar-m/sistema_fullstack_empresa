import db from "../config/db.js";

export default async function validateProduct(req, res, next) {
	try {
		const { id } = req.params;
		
		const [produto] = await db.query("SELECT * FROM produtos WHERE id=?", [id]);
		if(!produto.length) return res.status(404).json({ erro: "Produto não encontrado" });
		
		// req.file pode ser undefined se atualização sem imagem
		// Apenas valida se quiser criar obrigatoriamente uma imagem
		// if(!req.file) return res.status(400).json({ erro: "Imagem obrigatória" })
			
		req.produto = produto[0]; // opcional: passar o produto para o controllers
		next();
	} catch(err) {
		console.error(err);
		res.status(500).json({ erro: "Erro no middleware de validação" });
	}
}