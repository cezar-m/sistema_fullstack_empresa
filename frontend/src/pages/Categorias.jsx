import { useState, useEffect } from "react";
import api from "../api/api";
import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";

export default function Categorias() {
	const { user } = useAuth();
	const [categorias, setCategorias] = useState([]);
	const [nome, setNome] = useState("");
	const [editadoId, setEditadoId] = useState(null);
	
	// Paginação
	const [paginaAtual, setPaginaAtual] = useState(1);
	const categoriasPorPagina = 16;
	
	// Busca todas as categorias
	const carregarCategorias = async () => {
		try {
			const res = await api.get("/categorias");
			setCategorias(res.data);
		} catch(err) {
			console.error(err);
			alert(err?.response?.data?.erro || err.message || "Erro ao carregar categorias");
		}
	};
	
	useEffect(() => {
		carregarCategorias();
	}, []);
	
	// Limpar formulário
	const limpar = () => {
		setNome("");
		setEditadoId(null);
	};
	
	// Criar ou atualizar categoria
	const handleSubmit = async (e) => {
		e.preventDefault();
		if(!nome.trim()) {
			alert("O nome da categoria é obrigatório");
			return;
		}
		
		try {
			if(editadoId) {
				await api.put(`/categorias/${editadoId}`, { nome: nome.trim() });
			} else {
				await api.post("/categorias", { nome: nome.trim() });
			}
			
			limpar();
			carregarCategorias();
		} catch(err) {
			console.error(err)
			alert(err?.response?.data?.erro || err.message || "Erro ao salvar categoria");
		}
	};
	
	// Editar categoria
	const editar = (cat) => {
		setNome(cat.nome);
		setEditadoId(cat.id);
	};
	
	// Excluir categoria
	const excluir = async (id) => {
		if(!window.confirm("Deseja excluir esta categoria?")) return;
		try {
			await api.delete(`/categorias/${id}`);
			carregarCategorias();
		} catch(err) {
			console.error(err);
			alert(err?.response?.data?.erro || err.message || "Erro ao excluir categoria");
		}
	};
	
	// Paginação
	const indexUltimo = paginaAtual * categoriasPorPagina;
	const indexPrimeiro = indexUltimo - categoriasPorPagina;
	const categoriasPagina = categorias.slice(indexPrimeiro, indexUltimo);
	const totalPaginas = Math.ceil(categorias.length / categoriasPorPagina);
	
	return (
		<DashboardLayout>
			<div className="mb-2">
				<h2>Categorias</h2>
				
				{/* Formulário de cadastro/edição */}
				<form onSubmit={handleSubmit} className="card p-3 mb-4">
					<div className="d-flex align-items-center mb-2 gap-2">
					<label className="fw-semibold mb-0" style={{ width: "160px" }}>
						Nome da categória:
					</label>
					<input
						className="form-control mb-2 w-50"
						placeholder="Nome da categoria"
						value={nome}
						onChange={(e) => setNome(e.target.value)}
					/>
					</div>
					<div className="text-start">
						<button className="btn btn-success">
							{editadoId ? "Atualizar" : "Cadastrar"}
						</button>
					</div>
				</form>
				
				{/* Lista de categorias */}
				<table className="table table-bordered">
					<thead>
						<tr>
							<th>Nome</th>
							<th>Ações</th>
						</tr>
					</thead>
					<tbody>
					   {categoriasPagina.length === 0 && (
						  <tr>
							<td colSpan={2} className="text-center">
								Nenhuma categoria encontrada
							</td>
						  </tr>
						)}
						{categoriasPagina.map((cat) => (
							<tr key={cat.id}>
								<td>{cat.nome}</td>
								<td>
									<button
										className="btn btn-warning btn-sm me-2"
										onClick={() => editar(cat)}
									>
										Editar
									</button>
									<button
										className="btn btn-danger btn-sm"
										onClick={() => excluir(cat.id)}
									>
										Excluir
									</button>
								  </td>
							  </tr>
						))}
					</tbody>
				</table>
					
				{/* Paginação */}
				{totalPaginas > 1 && (
				<nav>
					<ul className="pagination">
						{Array.from({ length: totalPaginas }, (_, i) => (
						<li 
							key={i}
							className={`page-item ${
								paginaAtual === i + 1 ? "active" : ""
							}`}
						>
							<button
								className="page-link"
								onClick={() => setPaginaAtual(i + 1)}
							>
								{i + 1}
							</button>
						</li>				
						))}
					</ul>
				</nav>
				)}
			</div>
		</DashboardLayout>
	);
}
