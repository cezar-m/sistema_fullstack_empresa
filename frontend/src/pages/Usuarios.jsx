import { useEffect, useState } from "react";
import api from "../api/api";
import DashboardLayout from "../layouts/DashboardLayout";

export default function Usuarios() {
	const [usuarios, setUsuarios] = useState([]);
	const [mensagem, setMensagem] = useState("");
	const [loading, setLoading] = useState(false);
	
	// =========================
	// LISTAR USUÁRIOS
	// =========================
	useEffect(() => {
		listarUsuarios();
	}, []);
	
	const listarUsuarios = async () => {
		try {
			setLoading(true);
			const res = await api.get("/users");
			setUsuarios(res.data || []);
		} catch (err) {
			console.error(err);
			setMensagem(
				err.response?.data?.erro || "Erro ao carregar usuários"
			);
		} finally {
			setLoading(false);
		}
	};
	
	// =========================
	// DELETAR USUÁRIO
	// =========================
	const deletarUsuario = async(id) => {
		if(!window.confirm("Tem certeza que deseja excluir sete usuário?"))
			return;
		try {
			await api.delete(`/users/${id}`);
			setUsuarios((prev) => prev.filter((u) => u.id !== id));
			setMensagem("Usuário excluído com sucesso!!!");
		} catch (err) {
			console.error(err);
			setMensagem(
				err.response?.data?.erro || "Erro ao excluir usuário"
			);
		};
	};
		
	return(
		<DashboardLayout>
			<div className="container mt-4">
				<h3>Usuários</h3>
				
				{mensagem && (
					<div className="alert alert-info">{mensagem}</div>
				)}
				
				{loading && (
					<div className="alert alert-warning">
						Carregando...
					</div>
				)}
				
				<table className="table table-striped table-bordered mt-3">
					<thead>
						<tr>
							<th>Nome</th>
							<th>Email</th>
							<th>Acesso</th>
							<th>Ações</th>
						</tr>
					</thead>
					<tbody>
						{usuarios.map((u) => (
							<tr key={u.id}>
								<td>{u.nome}</td>
								<td>{u.email}</td>
								<td>
									<span 
										className={
											u.acesso === "admin"
												? "badge bg-danger"
												: "badge bg-secondary"
										}
										>
										{u.acesso}
									</span>
								</td>
								<td>
									<button 
										className="btn btn-sm btn-danger"
										onClick={() =>
											deletarUsuario(u.id)
										}
									>
										Excluir
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</DashboardLayout>
	);
}
