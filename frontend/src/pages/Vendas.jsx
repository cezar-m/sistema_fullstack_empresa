import { useState, useEffect } from "react";
import api from "../api/api";
import DashboardLayout from "../layouts/DashboardLayout";

const PaginaVendas = () => {
	const [produto, setProduto] = useState("");
	const [quantidade, setQuantidade] = useState(1);
	const [itens, setItens] = useState([]);
	const [vendas, setVendas] = useState([]);
	const [paginaAtual, setPaginaAtual] = useState(1);
	const [mensagem, setMensagem] = useState("");
	const [tipoMensagem, setTipoMensagem] = useState("");

	useEffect(() => {
		if(!mensagem) return;
		
		const timer = setTimeout(() => {
			setMensagem("")
		}, 3000);

		return() => clearTimeout(timer);
	}, [mensagem]);
	
	const vendasPorPagina = 10;
	const token = localStorage.getItem("token");
	
	const adicionarItem = () => {
		if(!produto || quantidade <= 0) return;
		
		setItens([...itens, { nome: produto, quantidade }]);
		setProduto("");
		setQuantidade(1);
	};
	
	const criarVenda = async () => {
		try {
			await api("/vendas",{ itens });
			
			setItens([]);
			await listarVendas();
			setPaginaAtual(1);
			alert("Venda realizada com sucesso!!!");
		} catch(err) {
			alert(err.response?.data?.erro || "Erro ao criar vendas");
		}
	};
	
	const listarVendas = async () => {
		try {
			const res = await api.get("/vendas");
			
			
			if(Array.isArray(res.data)) {
				setVendas(res.data);
			} else {
				console.log("Resposta inesperada:", res.data);
				setVendas([]);
			}
		} catch(error) {
			console.log("Erro ao buscar vendas:", error);
			setVendas([]);
		}
	};
		
	useEffect(() => {
		listarVendas();
	}, []);
	
	/* ========================= PAGINAÇÃO ========================= */
	
	const totalPaginas = Math.ceil(vendas.length / vendasPorPagina);
	
	const vendasPagina = vendas.slice(
		(paginaAtual - 1) * vendasPorPagina,
		paginaAtual * vendasPorPagina
	);
	
	return (
		<DashboardLayout>
			<div className="container mt-4">
				
				{/* Nova Venda */}
				<div className="card shadow mb-4">
					<div className="card-header bg-primary text-white fw-bold">
						Nova Venda
					</div>
					
					<div className="card-body">
						<div className="row g-3">
							<div className="col-md-6">
								<div className="d-flex align-items-center mb-2 gap-2">
									<label className="fw-semibold mb-0" style={{ width: "150px" }}>
										Nome do Produto:
									</label>
									<input
										className="form-control w-75"
										placeholder="Digite o nome do produto"
										value={produto}
										onChange={(e) => setProduto(e.target.value)}
									/>
								</div>
							</div>
							
							<div className="col-md-3">
								<div className="d-flex align-items-center mb-2 gap-2">
									<label className="fw-semibold mb-0" style={{ width: "150px" }}>
										Quantidade:
									</label>
									<input 
										type="number"
										className="form-control w-25"
										min="1"
										value={quantidade}
										onChange={(e) => setQuantidade(Number(e.target.value))}
									/>
								</div>
							</div>
							
							<div className="col-md-3">
								<button 
									className="btn btn-success w-100"
									onClick={adicionarItem}
								>
									Adicionar
								</button>
							</div>
						</div>
						
						{itens.length > 0 &&(
							<div className="mt-3">
								{itens.map((item, index) => (
									<div key={index}>
										{item.nome} - {item.quantidade}x
									</div>
								))}
							</div>
						)}
						
						<button
							className="btn btn-primary w-100 mt-3"
							onClick={criarVenda}
							disabled={itens.length === 0}	
						>
							Finalizar Vendas
						</button>
					</div>
				</div>
				
				{/* Lista de Vendas */}
				<div className="card shadow">
					<div className="card-header bg-dark text-white fw-bold">
						Minhas Vendas
					</div>
					
					<div className="card-body">
						{vendas.length === 0 ? (
							<p>Nenhuma venda encontrada</p>
						) : (
						<>
						<div className="table-responsive">
							<table className="table table-bordered table-hover">
								<thead className="table-light">
									<tr>
										<th>Data</th>
										<th>Produtos</th>
										<th>Total</th>
									</tr>
								</thead>
								
								<tbody>
									{vendasPagina.map((venda) => (
										<tr key={venda.id}>
											<td>
												{new Date(venda.data_venda)
													.toLocaleDateString("pt-BR")}
											</td>
											
											<td>
												{Array.isArray(venda.itens) && 
												venda.itens.map((item, index) => (
													<div key={index}>
														{item.produto} - {item.quantidade}x
													</div>
												))}
											</td>
										
											<td className="fw-bold text-success">
												R$ {Number(venda.total).toFixed(2)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
							
						{/* Paginação */}
						{totalPaginas > 1 && (
							<div className="d-flex justify-content-center mt-3">
								{Array.from({ length: totalPaginas }).map((_, index) => (
									<button
										key={index}
										className={`btn btn-sm mx-1 ${
											 paginaAtual === index + 1
											 ? "btn-success"
											 : "btn-outline-secondary"
										}`}
										onClick={() => setPaginaAtual(index + 1)}
									>
										{index + 1}
									</button>
								))}
							</div>
						)}
						</>
					 )}	
					</div>
				</div>
					
			</div>
		</DashboardLayout>
	);
};

export default PaginaVendas;
