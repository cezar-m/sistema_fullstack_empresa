import { useState, useEffect } from "react";
import axios from "axios";
import DashboardLayout from "../layouts/DashboardLayout";

const api = axios.create({
	baseURL: "http://localhost:5000/api",
});

api.interceptors.request.use((config) =>{
	const token = localStorage.getItem("token");
	if(token) config.headers.Authorization = `Bearer ${token}`;
	return config;
});

export default function Pagamentos() {
	const [produtos, setProdutos] = useState([]);
	const [formas, setFormas] = useState([]);
	const [pagamentos, setPagamentos] = useState([]);
	const [quantidade, setQuantidade] = useState(1);
	const [parcelasSelecionadas, setParcelasSelecionadas] = useState([]);
	
	const [produtoId, setProdutoId] = useState("");
	const [valor, setValor] = useState("");
	const [formaPagamento, setFormaPagamento] = useState("");
	const [qtdParcelas, setQtdParcelas] = useState(1);
	const [parcelas, setParcelas] = useState([]);
	const [mensagem, setMensagem] = useState("");
	const [loading, setLoading] = useState(false);
	
	const [editarPagamento, setEditarPagamento] = useState(null); // pagamento em edição
	const [novoStatus, setNovoStatus] = useState("pendente"); // status do modal
	const [editarParcela, setEditarParcela] = useState(null);			
	const [novoStatusParcela, setNovoStatusParcela] = useState("pendente");
	
	const [tipoMensagem, setTipoMensagem] = useState("");

	useEffect(() => {
		if(!mensagem) return;
		
		const timer = setTimeout(() => {
			setMensagem("")
		}, 3000);

		return() => clearTimeout(timer);
	}, [mensagem]);
	

	// =========================
	// PAGINAÇÃO
	// =========================
	const [pagina, setPagina] = useState(1);
	const registrosPorPagina = 10;
	const totalPaginas = Math.ceil(pagamentos.length / registrosPorPagina);
	
	const pagamentosPagina = pagamentos.slice(
		(pagina -1) * registrosPorPagina,
		pagina * registrosPorPagina
	);
	
	const irParaPagina = (num) => {
		if(num < 1) num = 1;
		if(num > totalPaginas) num = totalPaginas;
		setPagina(num)
	};
	
	// =========================
	// LISTAR DADOS
	// =========================
	useEffect(() => {
		const listarProdutos = async () => {
			try {
				setLoading(true);
				const res = await api.get("/products/listar");
				setProdutos(res.data || []); 
			} catch(err) {
				console.error(err);
				setMensagem("Erro ao carregar produtos");
			} finally {
				setLoading(false);
			}
		};
		
		const listarFormas = async () => {
			try {
				const res = await api.get("/formas-pagamento");
				setFormas(res.data || []);
			} catch(err) {
				console.error(err);
				setMensagem("Erro ao carregar formas de pagamento");
			}
		};
		
		const listarPagamentos = async () => {
			try {
				const res = await api.get("/pagamentos");
				setPagamentos(res.data || []);
			} catch(err) {
				console.error(err);
			}
		};
		
		listarProdutos();
		listarFormas();
		listarPagamentos();
	}, []);
	
	// =========================
	// AUTO PREENCHER VALOR
	// =========================
	useEffect(() => {
		if(!produtoId) {
			setValor("");
			return;
		}
		
		const produto = produtos.find(
			(p) => Number(p.id) === Number(produtoId)
		);
		
		if(produto) {
			const precoUnitario = Number(produto.preco || 0);
			const total = precoUnitario * quantidade;
			setValor(total);
		}
		
	}, [produtoId, quantidade, produtos]);
	
	// =========================
	// GERAR PARCELAS
	// =========================
	useEffect(() => {
		const valorNumero = Number(valor);

		if (!valorNumero || qtdParcelas <= 1) {
			setParcelas([]);
			return;
		}

		const valorBase = Math.floor((valorNumero / qtdParcelas) * 100) / 100;
		const resto = Number((valorNumero - valorBase * qtdParcelas).toFixed(2));

		const hoje = new Date();

		const novasParcelas = Array.from({ length: qtdParcelas }, (_, i) => {
		const venc = new Date(hoje);
		venc.setMonth(hoje.getMonth() + i + 1);

			return {
				numero: i + 1,
				valor: i === qtdParcelas - 1
					? Number((valorBase + resto).toFixed(2))
					: valorBase,
				data_vencimento: venc.toISOString().split("T")[0],
				status: "pendente"
			};
		});

		setParcelas(novasParcelas);
	}, 	[qtdParcelas, valor]);

		
	// =========================
	// CRIAR PAGAMENTO
	// =========================
	const criarPagamento = async () => {
		if(!produtoId || !formaPagamento || !valor) {
			setMensagem("Preencha todos os campos");
			return;
		}
		
		const produto = produtos.find((p) => Number(p.id) === Number(produtoId));
		if(!produto) {
			setMensagem("Produto inválido");
			return;
		}
		
		const payload = {
			nome_produto: produto.nome,
			forma_pagamento: formaPagamento,
			parcelas,
		};
		
		try {
			setLoading(true);
			const res = await api.post("/pagamentos", payload);
			setMensagem(res.data.msg || "Pagamento criado com sucesso!!!");
			
			setPagamentos((prev) => [
				{
					id: res.data.id_pagamento || prev.length + 1,
					nome_produto: produto.nome,
					forma_pagamento: formaPagamento,
					valor: Number(valor),
					status: "pago",
					data_pagamento: new Date().toISOString(),
					parcelas: parcelas,
				},
				...prev,
			]);
			
			setPagina(1);
			setProdutoId("");
			setValor("");
			setFormaPagamento("");
			setQtdParcelas(1);
			setParcelas([]);
		} catch(err) {
			console.error(err);
			setMensagem(err.response?.data?.erro || "Erro ao criar pagamento");
		} finally {
			setLoading(false);
		}
	};
	
	// =========================
	// ABRIR MODAL DE EDIÇÃO
	// =========================
	const abrirEdicao = (pagamento) => {
		setEditarPagamento(pagamento);
		setNovoStatus(pagamento.status);
	};
	
	// =========================
	// SALVAR EDIÇÃO
	// =========================
	const salvarEdicao = async () => {
		if(!editarPagamento) return;
		try {
			await api.put(`/pagamentos/pago/${editarPagamento.id}`, { status: novoStatus });
			setPagamentos((prev) => 
				prev.map((p) => 
					p.id === editarPagamento.id ? { ...p, status: novoStatus } : p
				)
			);
			setEditarPagamento(null);
			setMensagem("Pagamento atualizado com sucesso!!!");
		} catch(err) {
			console.error(err);
			setMensagem("Erro ao atualzar pagamento");
		}
		
	};
	
	const verParcelas = async (pagamento) => {
		if (!pagamento?.id) {
			setParcelasSelecionadas([]);
			return;
		}

		try {
			const res = await api.get(`/pagamentos/${pagamento.id}/parcelas`);
			setParcelasSelecionadas(res.data);
		} catch (err) {
			console.error("Erro ao buscar parcelas:", err);
			setParcelasSelecionadas([]);
		}
	};
	
	const salvarParcela = async () => {

		if(!editarParcela) return;
		try {
				await api.put(`/pagamentos/parcelas/${editarParcela.id}`, {
				status: novoStatusParcela
			});

			setParcelasSelecionadas((prev) =>
				prev.map((p) =>
					p.id === editarParcela.id
						? { ...p, status: novoStatusParcela }
						: p
					)
			);
			setEditarParcela(null);
			setMensagem("Parcela atualizada com sucesso!");
		} catch(err) {
			console.error(err);
			setMensagem("Erro ao atualizar parcela");
		}
	};
		
return(
	<DashboardLayout>
		<div className="container mt-4">
			<h3>Pagamentos</h3>
			{mensagem && <div className="alert alert-info">{mensagem}</div>}
			{loading && <div className="alert alert-warning">Carregando...</div>}
			
			{/* Formulário */}
			<div className="card shadow mb-3">
				<div className="card-body">
					<div className="row g-3">
						<div className="col-md-3">
							<label className="form-label">Produto:</label>
							<select
								className="form-select"
								value={produtoId}
								onChange={(e) => setProdutoId(e.target.value)}
							>
								<option value="">Selecione o Produto</option>
								{produtos.map((p) => (
									<option key={p.id} value={p.id}>
										{p.nome} - R$ {p.preco}
									</option>
								))}
							</select>
						</div>
						
						<div className="col-md-2">
							<label className="form-label">Quantidade:</label>
							<input 
								type="number"
								min="1"
								className="form-control"
								value={quantidade}
								onChange={(e) => setQuantidade(Number(e.target.value))}
								
							/>
						</div>
						
						<div className="col-md-2">
							<label className="form-label">Valor do Produto:</label>
							<input
								type="number"
								className="form-control"
								value={valor}
								onChange={(e) => setValor(e.target.value)}
							/>
						</div>
						
						<div className="col-md-3">
							<label className="form-label">Formas de Pagamentos:</label>
							<select
								className="form-select"
								value={formaPagamento}
								onChange={(e) => setFormaPagamento(e.target.value)}
							>
								<option value="">Forma Pagamento</option>
								{formas.map((f) => (
									<option key={f.id} value={f.nome}>
										{f.nome}
									</option>
								))}
							</select>
						</div>
						
						<div className="col-md-2">
							<label className="form-label">Nº Parcelas:</label>
							<input
								type="number"
								min="1"
								className="form-control"
								value={qtdParcelas}
								onChange={(e) => setQtdParcelas(Number(e.target.value))}
							/>
						</div>
						
						<div className="col-md-2">
							<button
								className="btn btn-success w-100"
								onClick={criarPagamento}
								disabled={loading}
							>
								Salvar
							</button>
						</div>
					</div>
				</div>
			</div>
			
			{/*  Tabela Pagamentos */}
			<div className="mt-4">
				<h5>Pagamentos realizados</h5>
				<table className="table table-striped table-bordered">
					<thead>
						<tr>
							<th>Produto</th>
							<th>Forma</th>
							<th>Valor</th>
							<th>Status</th>
							<th>Data</th>
							<th>Ações</th>
						</tr>
					</thead>
					<tbody>
					{pagamentosPagina.map((p) => (
						<tr key={p.id}>
							<td>{p.nome_produto}</td>
							<td>{p.forma_pagamento}</td>
							<td>R$ {Number(p.valor || 0).toFixed(2)}</td>
							<td style={{ color: p.status === "pendente" ? "red": "inherit" }}>
								{p.status}
							</td>
							<td>
								{p.data_pagamento
								? new Date(p.data_pagamento).toLocaleDateString()
								: "-"}
							</td>
							
							<td>
								<button
									className="btn btn-sm btn-info me-2"
									onClick={() => verParcelas(p)}
								>
									Parcelas
								</button>

								<button
									className="btn btn-sm btn-primary"
									onClick={() => abrirEdicao(p)}
								>
									Editar
								</button>
							</td>
						</tr>
					))}
					</tbody>
				</table>
				
				{/*  Tabela de Parcelamento */}
				{parcelasSelecionadas.length > 0 && (
					<div className="mt-4">
						<h5>Parcelamento</h5>

						<table className="table table-bordered">
							<thead>
								<tr>
									<th>Parcela</th>
									<th>Valor</th>
									<th>Vencimento</th>
									<th>Status</th>
									<th>Ações</th>
								</tr>
							</thead>
							<tbody>
								{parcelasSelecionadas.map((parcela) => (
									<tr key={parcela.numero_parcela}>
										<td>{parcela.numero_parcela}</td>
										<td>
											R$ {Number(parcela.valor).toFixed(2)}
										</td>
										<td>
											{new Date(parcela.data_vencimento)
												.toLocaleDateString("pt-BR")}
										</td>
										<td
											style={{
												color:
													parcela.status === "pendente"
														? "red"
														: parcela.status === "cancelado"
														? "gray"
														: "black"
											}}
										>
											{parcela.status}
										</td>										
										<td>
											<button
												className="btn btn-sm btn-primary"
												onClick={() => {
													setEditarParcela(parcela);
													setNovoStatusParcela(parcela.status);
												}}
											>
												Editar
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				
				{/* Paginação */}
				<div className="d-flex justify-content-between align-items-center">
					<button
						className="btn btn-secondary"
						onClick={() => irParaPagina(pagina - 1)}
						disabled={pagina ===1}
					>
						Anterior
					</button>
					<span>
						Página {pagina} de {totalPaginas || 1}
					</span>
					<button 
						className="btn btn-secondary"
						onClick={() => irParaPagina(pagina + 1)}
						disabled={pagina === totalPaginas || totalPaginas === 0}
					>
						Próximo
					</button>
				</div>
			</div>
			
			{/* Modal de Edição */}
			{editarPagamento && (
				<div
					className="modal show d-block"
					style={{ backgroundColor: "#00000080" }}
				>
					<div className="modal-dialog">
						<div className="modal-content">
							<div className="modal-header">
								<h5 className="modal-title">Editar Pagamento #{editarPagamento.id}</h5>
								<button
									className="btn-close"
									onClick={() => setEditarPagamento(null)}
								>
								</button>
							</div>
							<div className="modal-body">
								<label>Status:</label>
								<select
									className="form-select"
									value={novoStatus}
									onChange={(e) => setNovoStatus(e.target.value)}
								>
									<option value="pendente">Pendente</option>
									<option value="pago">Pago</option>
									<option value="cancelado">Cancelado</option>
								</select>
							</div>
							<div className="modal-footer">
								<button
									className="btn btn-secondary"
									onClick={() => setEditarPagamento(null)}
								>
									Fechar
								</button>
								<button className="btn btn-primary" onClick={salvarEdicao}>
									Salvar
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
			
			{/* Modal Editar Parcela */}
			{editarParcela && (
			<div
				className="modal show d-block"
				style={{ backgroundColor: "#00000080" }}
			>
				<div className="modal-dialog">
					<div className="modal-content">

						<div className="modal-header">
							<h5 className="modal-title">
								Editar Parcela {editarParcela.numero_parcela}
							</h5>

							<button
								className="btn-close"
								onClick={() => setEditarParcela(null)}
							/>
						</div>

						<div className="modal-body">

							<label>Status:</label>

							<select
								className="form-select"
								value={novoStatusParcela}
								onChange={(e) =>
									setNovoStatusParcela(e.target.value)
								}
							>

								<option value="pendente">Pendente</option>
								<option value="pago">Pago</option>
								<option value="cancelado">Cancelado</option>

							</select>

						</div>

						<div className="modal-footer">

							<button
								className="btn btn-secondary"
								onClick={() => setEditarParcela(null)}
							>
								Fechar
							</button>

							<button
								className="btn btn-primary"
								onClick={salvarParcela}
							>
								Salvar
							</button>

						</div>

					</div>
				</div>
			</div>
		)}

		</div>
	</DashboardLayout>
	)
}