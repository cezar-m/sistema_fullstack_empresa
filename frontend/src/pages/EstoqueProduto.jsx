import { useState, useEffect } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/api";

export default function Estoque() {
	const [idProduto, setIdProduto] = useState(null);
	const [nomeProduto, setNomeProduto] = useState("");
	const [quantidade, setQuantidade] = useState(0);
	const [estoque, setEstoque] = useState([]);
	const [mensagem, setMensagem] = useState("");
	const [paginaAtual, setPaginaAtual] = useState(1);
	const [itensPorPagina] = useState(10);

	const token = localStorage.getItem("token");

	useEffect(() => {
		if (!mensagem) return;
		const timer = setTimeout(() => setMensagem(""), 3000);
		return () => clearTimeout(timer);
	}, [mensagem]);

	/* ========================= LISTAR ========================= */
	const listarEstoque = async () => {
		try {
			const res = await api.get("/estoque", {
				headers: { Authorization: `Bearer ${token}` },
			});
			setEstoque(res.data);
		} catch (err) {
			console.error(err);
			setEstoque([]);
		}
	};

	useEffect(() => {
		listarEstoque();
	}, []);

	/* ========================= CADASTRAR ========================= */
	const cadastrarEstoque = async () => {
		if (!nomeProduto || quantidade <= 0) {
			setMensagem("Preencha nome e quantidade!");
			return;
		}

		try {
			const res = await api.post(
				"/estoque",
				{ nome_produto: nomeProduto, quantidade },
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			setMensagem(res.data.msg);
			limparCampos();
			listarEstoque();
		} catch (err) {
			setMensagem(err?.response?.data?.erro || "Erro ao cadastrar");
		}
	};

	/* ========================= ATUALIZAR ========================= */
	const atualizarEstoque = async () => {
		if (!idProduto || quantidade < 0) {
			setMensagem("Selecione um produto!");
			return;
		}

		try {
			const res = await api.put(
				`/estoque/${idProduto}`, // 🔥 CORRETO
				{ quantidade },
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			setMensagem(res.data.msg);
			limparCampos();
			listarEstoque();
		} catch (err) {
			setMensagem(err?.response?.data?.erro || "Erro ao atualizar");
		}
	};

	/* ========================= DELETAR ========================= */
	const deletarEstoque = async (id) => {
		try {
			const res = await api.delete(
				`/estoque/${id}`, // 🔥 CORRETO
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			setMensagem(res.data.msg);
			limparCampos();
			listarEstoque();
		} catch (err) {
			setMensagem(err?.response?.data?.erro || "Erro ao deletar");
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

	return (
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
							<div className="col-md-6 d-flex gap-2">
								<input
									type="text"
									className="form-control"
									placeholder="Nome do produto"
									value={nomeProduto}
									onChange={(e) => setNomeProduto(e.target.value)}
								/>
							</div>

							<div className="col-md-3">
								<input
									type="number"
									className="form-control"
									placeholder="Quantidade"
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
						<table className="table table-bordered">
							<thead>
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
													deletarEstoque(item.id_produto);
												}}
											>
												Deletar
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>

						<div className="d-flex justify-content-center">
							{Array.from({ length: totalPaginas }, (_, i) => (
								<button
									key={i}
									className="btn btn-sm btn-outline-primary m-1"
									onClick={() => mudarPagina(i + 1)}
								>
									{i + 1}
								</button>
							))}
						</div>
					</div>
				</div>
			</div>
		</DashboardLayout>
	);
}
