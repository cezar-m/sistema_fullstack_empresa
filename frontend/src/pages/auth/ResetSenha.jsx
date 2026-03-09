import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";

export default function ResetSenha() {
	const { token } = useParams();
	const navigate = useNavigate();
	
	const [novaSenha, setNovaSenha] = useState("");
	const [confirmarSenha, setConfirmarSenha] = useState("");
	const [erro, setErro] = useState("");
	const [loading, setLoading] = useState(false);
	
	if(!token) {
		return (
			<div className="container mt-5">
				<div className="alert alert-danger">
					Token inválido.
				</div>
			</div>
		);
	}
	
	const handleSubmit = async (e) => {
		e.preventDefault();
		setErro("");
		
		if(!novaSenha || !confirmarSenha) {
			setErro("Preencha todos os campos.");
			return;
		}
		
		if (novaSenha.length < 5) {
			setErro("Senha deve ter no mínimo 5 caracteres.");
			return;
		}

		
		if(novaSenha !== confirmarSenha) {
			setErro("As senhas não coincidem.");
			return;
		}
		
		try {
			setLoading(true);
			
			await api.put("/auth/redefinir-senha", {
				token,
				novaSenha
			});
			
			// Redireciona direto para login
			navigate("/");
		
		} catch(err) {
			setErro(err.response?.data?.erro || "Erro ao redefinir senha");
		} finally {
			setLoading(false);
		}
	};
	
	return (
		<div className="container mt-5">
			<div className="card p-4 shadow">
				<h3>Redefinir Senha</h3>
				
				{erro && <div className="alert alert-danger">{erro}</div>}
				
				<form onSubmit= {handleSubmit}>
					<input 
						type="password"
						className="form-control mb-2"
						placeholder="Nova senha"
						value={novaSenha}
						onChange={(e) => setNovaSenha(e.target.value)}
					/>
					
					<input
						type="password"
						className="form-control mb-3"
						placeholder="Confirma senha"
						value={confirmarSenha}
						onChange={(e) => setConfirmarSenha(e.target.value)}
					/>
					
					<div className="text-start">
						<button
							className="btn btn-warning"
							disabled={loading}
						>
						{loading ? "Salvando..." : "Salvar nova senha"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
} 