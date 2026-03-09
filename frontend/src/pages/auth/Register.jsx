import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";

export default function Register() {
	const navigate = useNavigate();
	
	const [form, setForm] = useState({
		nome: "",
		email: "",
		senha: "",
		confirmarSenha: "",
		acesso: "",
	});
	
	const [erros, setErros] = useState({});
	const [mensagem, setMensagem] = useState("");
	const [erroApi, setErroApi] = useState("");

	const handleChange = (e) => {
		setForm({ ...form, [e.target.name]: e.target.value });
	};
	
	// Função de validação
	const validarCampos = () => {
		let novosErros = {};
		
		if(!form.nome.trim()) {
			novosErros.nome = "Nome é obrigatório";
		}
		
		if(!form.email.trim()) {
			novosErros.email = "Email é obrigatório";
		} else if (!/\S+@\S+\.\S+/.test(form.email)) {
			novosErros.email = "Email inválido";
		}
		
		if(!form.senha) {
			novosErros.senha = "Senha é obrigatório";
		} else if (form.senha.length < 5) {
			novosErros.senha = "Senha deve ter no mínimo 5 caracteres";
		}
		
		if(!form.confirmarSenha) {
			novosErros.confirmarSenha="Confirma a senha";
		} else  if(form.senha !== form.confirmarSenha) {
			novosErros.confirmarSenha = "As senhas não coincidem";
		}
		
		return novosErros;
	};
	
	const handleSubmit = async (e) => {
		e.preventDefault();
		setMensagem("");
		setErroApi("");
		
		const validacao = validarCampos();
		
		if(Object.keys(validacao).length > 0) {
			setErros(validacao);
			return;
		}
		
		setErros({});
		
		try {
			await api.post("/auth/register", {
				nome: form.nome,
				email: form.email,
				senha: form.senha,
				acesso: form.acesso,
			});
			
			setMensagem("Cadastro realizado com sucesso!!!");
			
			setTimeout(() => {
				navigate("/");
			}, 2000);
		} catch(err) {
			setErroApi(err.response?.data?.erro || "Erro ao cadastrar");
		}
	};
	
	return (
		<div className="container mt-5">
			<div className="card p-4 shadow">
				<h3>Cadastro</h3>
				
				{mensagem && (
					<div className="alert alert-success">{mensagem}</div>
				)}
				
				{erroApi && (
					<div className="alert alert-danger">{erroApi}</div>
				)}
				
				<form onSubmit={handleSubmit} noValidate >
					<div className="d-flex align-items-center mb-3">
						<label className="me-2 mb-0" style={{ width: "150px" }}>Nome:</label>
						<input 
							type="text" 
							name="nome" 
							placeholder="Nome" 
							className={`form-control mb-1 ${erros.nome ? "is-invalid" : ""}`} 
							style={{ width: "650px" }}
							value={form.nome} 
							onChange={handleChange}
						/>
					</div>
					{erros.nome && (
					<div className="invalid-feedback">{erros.nome}</div>
					)}
					<div className="d-flex align-items-center mb-3">
						<label className="me-2 mb-0" style={{ width: "150px" }}>E-mail:</label>
						<input 
							type="email" 
							name="email" 
							placeholder="Email" 
							className={`form-control mb-1 ${erros.email ? "is-invalid" : ""}`} 
							style={{ width: "650px" }}
							value={form.email} 
							onChange={handleChange}
						/>
					</div>
					{erros.email && (
						<div className="invalid-feedback">{erros.email}</div>
					)}
					<div className="d-flex align-items-center mb-3">
						<label className="me-2 mb-0" style={{ width: "150px" }}>Acesso:</label>
						<select 
							name="acesso"
							className={`form-select ${erros.acesso ? "is-invalid" : ""}`}
							style={{ width: "650px" }}
							value={form.acesso}
							onChange={handleChange}
						>
							<option value="">Selecione o nível de acesso</option>
							<option value="usuario">Usuário</option>
							<option value="admin">Administrador</option>
						</select>
					</div>
					{erros.acesso && <div className="invalid-feedback">{erros.acesso}</div>}
					<div className="d-flex align-items-center mb-3">					
						<label className="me-2 mb-0" style={{ width: "150px" }}>Senha:</label>
						<input 
							type="password" 
							name="senha" 
							placeholder="Senha" 
							className={`form-control mb-1 ${erros.senha ? "is-invalid" : ""}`} 
							style={{ width: "650px" }}
							value={form.senha} 
							onChange={handleChange}
						/>
					</div>
					{erros.senha && (
						<div className="invalid-feedback">{erros.senha}</div>
					)}
					
					{/* Confirmar Senha */}
					<div className="d-flex align-items-center mb-3">					
						<label className="me-2 mb-0" style={{ width: "150px" }}>Confirmar a Senha:</label>
						<input
							type="password"
							name="confirmarSenha"
							placeholder="Confirmar senha"
							className={`form-control mb-3 ${erros.confirmarSenha ? "is-invalid" : ""}`}
							style={{ width: "650px" }}
							value={form.confirmarSenha}
							onChange={handleChange}
						/>
					</div>
					{erros.confirmarSenha && (
						<div className="invalid-feedback">
							{erros.confirmarSenha}
						</div>
					)}
					<button className="btn btn-primary">
						Cadastrar
					</button>
				</form>
			</div>
		</div>
	);	
}