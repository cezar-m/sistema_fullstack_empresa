import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../api/api";

export default function EsqueciSenha() {
	const location = useLocation();
	const navigate = useNavigate();
	
	const [email, setEmail] = useState("");
	const [erro, setErro] = useState("");
	const [loading, setLoading] = useState(false);
	
	// Preenche email se vier da URL
	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const emailParam = params.get("email");
		if(emailParam) {
			setEmail(emailParam);
		}
	}, [location.search]);
	
	const handleSubmit = async (e) => {
		e.preventDefault();
		setErro("");
		
		if(!email) {
			setErro("Informe o email.");
			return;
		}
		
		try {
			setLoading(true);
			
			const res = await api.post("/auth/esqueci-senha", { email });
			
			console.log("REPOSTA BACKEND:", res.data);
			
			// o backend precisa retornar o token aqui
			const token = res.data.reset_token;
			
			if(!token) {
				setErro("Erro ao gerar token.");
				return;
			}
			
			// Redireciona direto
			navigate(`/redefinir-senha/${token}`);
		} catch (err) {
			setErro(err.response?.data?.erro || "Erro ao processar.");
		} finally {
			setLoading(false);
		}
	};
	
	return (
		<div className="container mt-5">
			<div className="card p-4 shadow">
				<h3>Esqueci minha senha</h3>
				
				{erro && <div className="alert alert-danger">{erro}</div>}
				
				<form onSubmit={handleSubmit}>
					<input 
						type="email"
						className="form-control mb-3"
						placeholder="Digite seu email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
					/>
					
					<button
						className="btn btn-primary"
						disabled={loading}
					>
						{loading ? "Processando..." : "Enviar"}
					</button>
				</form>
			</div>
		</div>			
	);
}