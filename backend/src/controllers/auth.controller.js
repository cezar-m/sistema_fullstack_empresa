import db from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";

/* =========================
   REGISTER
========================= */
export const register = async (req, res) => {
	try {
		const { nome, email, senha, acesso } = req.body;
		
		if(!nome || !email || ! senha)
			return res.status(400).json({ erro: "Campos obrigatórios" });

			const hash = await bcrypt.hash(senha, 10);
			
			await db.query(
				`INSERT INTO usuarios(nome, email, senha, acesso)
				 VALUES($1,$2,$3,$4)`,
				 [nome, email, hash, acesso || "usuario"]
			);
			
			res.json({ msg: "Usuário cadastrado com sucesso!!!" });
		
	} catch(err) {
		console.error(err);
		res.status(500).json({ erro: "Erro ao cadastrar" });
	}
};

/* =========================
   LOGIN
========================= */
export const login = async (req, res) => {
  try {

    const { email, senha } = req.body;

    if(!email || !senha)
      return res.status(400).json({ erro: "Email e senha obrigatórios" });

    const result = await db.query(
      "SELECT * FROM usuarios WHERE email=$1",
      [email]
    );

    if(!result.rows.length)
      return res.status(404).json({ erro: "Usuário não encontrado" });

    const user = result.rows[0];

    const ok = await bcrypt.compare(senha, user.senha);

    if(!ok)
      return res.status(401).json({ erro: "Senha inválida" });

    if(!process.env.JWT_SECRET)
      throw new Error("JWT_SECRET não definido");

    const token = jwt.sign(
      { id: user.id, acesso: user.acesso, nome: user.nome },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      usuario: {
        id: user.id,
        nome: user.nome,
        acesso: user.acesso
      }
    });

  } catch(err) {
    console.error("Erro login:", err);
    res.status(500).json({ erro: "Erro no login" });
  }
};


/* =========================
   ESQUECI SENHA
========================= */
export const esqueciSenha = async (req, res) => {
	try {
		
		const { email } = req.body;
		
		const token = uuid();
		
		const result = await db.query(
			"SELECT id FROM usuarios WHERE email=$1",
			[email]
		);

		const user = result.rows;
		
		if(!user.length)
			return res.status(400).json({ erro: "Email não encontrado" });
		
		await db.query(
			"UPDATE usuarios SET reset_token=$1 WHERE email=$2",
			[token, email]
		);
		
		res.json({
				msg: "Token criado",
				reset_token: token
		});
	
	} catch(err) {
		console.error(err);
		res.status(500).json({ erro: "Erro ao gerar reset" });
	} 
};

/* =========================
   REDEFINIR SENHA
========================= */
export const redefinirSenha = async (req, res) => {
	try {
		
		const { token, novaSenha } = req.body;
		
		if(!token || !novaSenha)
			return res.status(400).json({ erro: "Campos obrigatórios" });
		
			const result = await db.query(
				"SELECT id FROM usuarios WHERE reset_token=$1",
				[token]
			);

			const user = result.rows;
			
			if(!user.length)
				return res.status(404).json({ erro: "Token inválido" });
			
			const hash = await bcrypt.hash(novaSenha, 10);
			
			await db.query(
				`UPDATE usuarios
				 SET senha=$1, reset_token=NULL
				 WHERE id=$2`,
				 [hash, user[0].id]
			);
			
			res.json({ msg: "Senha alterada com sucesso!!!" });
	
	} catch(err) {
		console.error(err);
		res.status(500).json({ erro: "Erro redefinir senha" });
	}
};

/* =========================
   LOGOUT
========================= */
export const logout = (req, res) => {
	res.json({ msg: "Logout realizado com sucesso!!!" });
};
