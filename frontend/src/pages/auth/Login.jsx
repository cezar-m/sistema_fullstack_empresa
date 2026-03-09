import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
	const [email, setEmail] = useState("");
	const [senha, setSenha] = useState("");
	const [erro, setErro] = useState(""); // mensagem de erros
	const { login } = useAuth();
	const nav = useNavigate();
	
	const handle = async (e) => {
		e.preventDefault();
		
		// Validação de campos vazios
		if(!email && !senha) {
			setErro("Preencha o email");
			return;
		}
		if(!email) {
			setErro("Preencha o email");
			return;
		}
		if(!senha) {
			setErro("Preencha a senha");
			return;
		}
		
		try {
			await login(email, senha);
			setErro(""); // limpa erro
			nav("/dashboard"); // redireciona
		} catch (err) {
			// se login falhar
			setErro("Email ou senha inválido");
		}
	};
	
	return (
			<div className="login-container">
				<div className="login-card">
			<h3 className="login-title">Login</h3>
			
			{erro && (
				<div className="alert alert-danger py-2">
					{erro}
				</div>
			)}
			
			<form onSubmit={handle}>
				<input 
					className="login-input"
					placeholder="Email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
				/>
				
				<input
					type="password"
					className="login-input"
					placeholder="Senha"
					value={senha}
					onChange={(e) => setSenha(e.target.value)}
				/>
				
				<button className="login-button">Entrar</button>
				
				<div className="login-links">
					<Link to="/register" className="link-custom d-block mb-1">Cadastrar</Link>
					<Link to={`/esqueci-senha?email=${email}`} className="link-custom d-block">Esqueci senha</Link>
				</div>
			</form>
		</div>
	</div>
	);
} 