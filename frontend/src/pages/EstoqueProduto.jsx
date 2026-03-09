import { useState, useEffect } from "react";
import axios from "axios";
import DashboardLayout from "../layouts/DashboardLayout";

export default function Estoque() {
	const [idProduto, setIdProduto] = useState(null); // ID do produto selecionado
	const [nomeProduto, setNomeProduto] = useState("");
	const [quantidade, setQuantidade] = useState(0);
	const [estoque, setEstoque] = useState([]);
	const [mensagem, setMensagem] = useState("");
	const [paginaAtual, setPaginaAtual] = useState(1);
	const [itensPorPagina] = useState(10);
	
	const token = localStorage.getItem("token");
	
	const [tipoMensagem, setTipoMensagem] = useState("");

	useEffect(() => {
		if(!mensagem) return;
		
		const timer = setTimeout(() => {
			setMensagem("")
		}, 3000);

		return() => clearTimeout(timer);
	}, [mensagem]);
	
	 /* ========================= LISTAR ESTOQUE ========================= */
	const listarEstoque = async() => {
		try {
			const res = await axios.get("http://localhost:5000/api/estoque", {
				headers: { Authorization: `Bearer ${token}` },
			});
			setEstoque(res.data);
		} catch(err) {
			console.error(err);
			setEstoque([]);
		}
	};
	
	useEffect(() => {
		listarEstoque();	
	}, []);
	
	 /* ========================= CADASTRAR ========================= */
	const cadastrarEstoque = async () => {
		if(!nomeProduto || quantidade <= 0) {
			setMensagem("Preencha nome e quantidade!");
			return;
		}
		try {
			const res = await axios.post(
				"http://localhost:5000/api/estoque",
				{ nome_produto: nomeProduto, quantidade },
				{ headers: { Authorization: `Bearer ${token}` } }
			);
			setMensagem(res.data.msg);
			limparCampos();
			listarEstoque();
		} catch (erro) {
			setMensagem(erro.response?.data?.erro || "Erro ao cadastrar");
		}
	};
	
	 /* ========================= ATUALIZAR ========================= */
	const atualizarEstoque = async () => {
		if(!idProduto || !nomeProduto || quantidade < 0) {
			setMensagem("Selecione um produto e preencha quantidade!");
			return;
		}
		try {
			const res = await axios.put(
				"http://localhost:5000/api/estoque",
				{ id_produto: idProduto, nome_produto: nomeProduto, quantidade },
				{ headers: { Authorization: `Bearer ${token}` } }
			);
			setMensagem(res.data.msg);
			limparCampos();
			listarEstoque();
		} catch (err) {
			setMensagem(erro.response?.data?.erro || "Erro ao atualizar");
		}
	};
	
	/* ========================= DELETAR ========================= */
	const deletarEstoque = async (id) => {
		try {
			const res = await axios.delete("http://localhost:5000/api/estoque", {
				headers: { Authorization: `Bearer ${token}` },
				data: { id_produto: id },
			});
			setMensagem(res.data.msg);
			limparCampos();
			listarEstoque();
		} catch (err) {
			setMensagem(err.response?.data?.erro || "Erro ao deletar");
		}
	};
	
	const limparCampos = () => {
		setIdProduto(null);
		setNomeProduto("");
		setQuantidade(0);
	};
	
	// Paginação
	const indexUltimoItem = paginaAtual * itensPorPagina;
	const indexPrimeiroItem = indexUltimoItem - itensPorPagina;
	const estoquePagina = estoque.slice(indexPrimeiroItem, indexUltimoItem);
	const totalPaginas = Math.ceil(estoque.length / itensPorPagina);
	
	const mudarPagina = (num) => setPaginaAtual(num);
	
	return(
		<DashboardLayout>
			<div className="container mt-4">
				<h3>Gerenciar Estoque</h3>
				
				{mensagem && <div className="alert alert-info">{mensagem}</div>}
				
				<div className="card shadow mb-4">
					<div className="card-header bg-primary text-white fw-bold">
						Cadastrar / Atualizar
					</div>
					<div className="card-body">
						<div className="row g-3">
							<div className="col-md-6 d-flex align-items-center gap-2">
								<span className="fw-semibold">Nome Produto:</span>
								<input
									type="text"
									className="form-control w-75"
									placeholder="Nome do produto"
									value={nomeProduto}
									onChange={(e) => setNomeProduto(e.target.value)}
								/>
							</div>
							<div className="col-md-3 d-flex align-items-center gap-2">
								<span className="fw-semibold">Quantidade:</span>
								<input 
									type="number"
									className="form-control w-75"
									placeholder="Quantidade"
									min="0"
									value={quantidade}
									onChange={(e) => setQuantidade(Number(e.target.value))}
								/>
							</div>
							<div className="col-md-3 d-flex gap-2">
								<button className="btn btn-success w-100" onClick={cadastrarEstoque}>
									Cadastrar
								</button>
								<button className="btn btn-warning w-100" onClick={atualizarEstoque}>
									Atualizar
								</button>
							</div>
						</div>
					</div>
				</div>
				
				<div className="card shadow">
					<div className="card-header bg-dark text-white fw-bold">
						Estoque Atual
					</div>
					<div className="card-body table-responsive">
						{estoque.length === 0 ? (
							<p>Nenhum produto em estoque.</p>
						) : (
							<>
								<table className="table table-bordered table-hover">
									<thead className="table-light">
										<tr>
											<th>Produto</th>
											<th>Quantidade</th>
											<th>Ações</th>
										</tr>
									</thead>
									<tbody>
										{estoquePagina.map((item) => (
											<tr
												key={item.id_produto}
												onClick={() => {
													setIdProduto(item.id_produto);
													setNomeProduto(item.produto);
													setQuantidade(item.quantidade);
												}}
												style={{ cursor: "pointer" }}
											>
												<td>{item.produto}</td>
												<td>{item.quantidade}</td>
												<td>
													<button
														className="btn btn-danger btn-sm"
														onClick={(e) => {
															e.stopPropagation();
															deletarEstoque(item.id_produto)
														}}
													>
														Deletar
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
								
								<nav>
									<ul className="pagination justify-content-center">
										{Array.from({ length: totalPaginas }, (_, i) =>(
											<li key={i + 1} className={`page-item ${paginaAtual === i + 1 ? "active" : ""}`}>
												<button className="page-link" onClick={() => mudarPagina(i + 1)}>
													{i + 1}
												</button>
											</li>
										))}
									</ul>
								</nav>
							</>
						)}
					</div>
				</div>
			</div>
		</DashboardLayout>
	);
}