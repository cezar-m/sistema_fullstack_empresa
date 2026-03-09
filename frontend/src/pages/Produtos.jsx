import { useState, useEffect } from "react";
import api from "../api/api";
import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";

export default function Produtos() {
	const { user } = useAuth();
	const [produtos, setProdutos] = useState([]);
	const [categorias, setCategorias] = useState([]);

	const [nome, setNome] = useState("");
	const [preco, setPreco] = useState("");
	const [categoria, setCategoria] = useState("");
	const [quantidade, setQuantidade] = useState("");
	const [imagem, setImagem] = useState(null);
	const [preview, setPreview] = useState(null);
	const [editadoId, setEditadoId] = useState(null);
	const [mensagem, setMensagem] = useState("");
	const [tipoMensagem, setTipoMensagem] = useState("");

	useEffect(() => {
		if(!mensagem) return;
		
		const timer = setTimeout(() => {
			setMensagem("")
		}, 3000);

		return() => clearTimeout(timer);
	}, [mensagem]);

	// Busca e filtro
	const [busca, setBusca] = useState("");
	const [filtroPreco, setFiltroPreco] = useState(""); // "maior" | "menor"
	
	// Paginação
	const [paginaAtual, setPaginaAtual] = useState(1);
	const produtosPorPagina = 12;
	
	// Carrega produtos e categorias
	useEffect(() => {
		carregarProdutos();
		carregarCategorias();
	}, []);
	
	// Formata preço para exibição
	const formatarPreco = (valor) => {
		if(valor == null || isNaN(valor)) return "R$ 0,00";
		return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
	};
	
	// Inpurt de preços (apenas números)
	const handlePrecoChange = (e) => {
		let valor = e.target.value.replace(/\D/g, "");
		
		if(!valor) {
			setPreco("");
			return;
		}
		
		valor = (parseInt(valor) / 100).toLocaleString("pt-BR", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}); 
		
		setPreco(valor);
	};
	
	// Carrega produtos do usuário
	const carregarProdutos = async () => {
		try {
			const res = await api.get("/products/meus"); // endpoint backend /meus
			const produtosComPreco = res.data.map((p) => ({
				...p,
				preco: p.preco != null ? Number(p.preco) : 0,
			}));
			setProdutos(produtosComPreco);
		} catch(err) {
			console.error(err);
			alert(err.response?.data?.erro || "Erro ao carregar produtos");
		}
	};
	
	// Carrega categorias
	const carregarCategorias = async () => {
		try {
			const res = await api.get("/categorias");
			setCategorias(res.data);	
		} catch(err) {
			console.error(err);
			alert(err.response?.data?.erro || "Erro ao carregar categorias");
		}
	};
	
	// Preview da imagem
	const handleImagem = (e) => {
		const file = e.target.files[0];
		setImagem(file);
		if(file) setPreview(URL.createObjectURL(file));
	};
	
	// Limpa formulário
	const limpar = () => {
		setNome("");
		setPreco("");
		setCategoria(""),
		setQuantidade(""),
		setImagem(null),
		setPreview(null),
		setEditadoId(null);
	};
	
	// Criar ou atualizar produto
	const handleSubmit = async (e) => {
		e.preventDefault();
		if(!nome || !preco || !categoria) {
			alert("Nome, preço e categoria são obrigatórios");
			return;
		}
		
		const formData = new FormData()
		formData.append("nome", nome);
		
		// converter preço para número decimal
		const precoNumerico = Number(preco.toString().replace(",", "."));
		formData.append("preco", precoNumerico);
		
		formData.append("categoria", categoria);
		formData.append("quantidade", quantidade || 0);
		if(imagem) formData.append("imagem", imagem);
		
		try {
			if(editadoId) {
				await api.put(`/products/${editadoId}`, formData, {
					headers: { "Content-Type": "multipart/form-data" },
				});
				setMensagem("Produto atualizado com sucesso!!!");
			} else {
				await api.post("/products", formData, {
					headers: { "Content-Type": "multipart/form-data"  },
				});
				setMensagem("Produto cadastrado com sucesso!!!");
			}
			
			setTipoMensagem("success");
			
			// desaparecer depois de 3 segundos
			setTimeout(() => {
				setMensagem("");
			}, 3000)
			
			limpar();
			carregarProdutos();	
		} catch(err) {
			console.error(err);
			alert(err.response?.data?.erro || "Erro ao salvar produto");
		}
	};
	
	// Editar produto
	const editar = (p) => {
		setNome(p.nome);
		setPreco(p.preco != null ? p.preco.toFixed(2) : "");
		setCategoria(p.id_categoria || "");
		setQuantidade(p.quantidade != null ? p.quantidade : "");
		setPreview(p.imagem ? `http://localhost:5000/uploads/${p.imagem}` : null);
		setImagem(null);
		setEditadoId(p.id);
	};
	
	// Excluir produto
	const excluir = async (id) => {
		if(!window.confirm("Deseja excluir este produto ?")) return;
		try {
			await api.delete(`/products/${id}`);
			
			setMensagem("Produto excluído");
			setTipoMensagem("danger");
			
			carregarProdutos();
			
			setTimeout(() => {
				setMensagem("");
			}, 3000)
		} catch(err) {
			console.error(err);
			alert(err.response?.data?.erro || "Erro ao excluir produto");
		}
	};
	
	// Filtragem por busca e preço
	let produtosFiltrados = produtos.filter((p) =>
		p.nome.toLowerCase().includes(busca.toLowerCase())
	);
	if(filtroPreco === "maior" && produtosFiltrados.length > 0) {
	const maxPreco = Math.max(...produtosFiltrados.map((p) => p.preco));
	produtosFiltrados = produtosFiltrados.filter((p) => p.preco === maxPreco);
}
	
	
	if(filtroPreco === "maior" && produtosFiltrados.length > 0) {
		const maxPreco = Math.max(...produtosFiltrados.map((p) => p.preco));
		produtosFiltrados = produtosFiltrados.filter((p) => p.preco == maxPreco);
	} else if(filtroPreco === "menor" && produtosFiltrados.length > 0) {
		const minPreco = Math.min(...produtosFiltrados.map((p) => p.preco));
		produtosFiltrados = produtosFiltrados.filter((p) => p.preco === minPreco);
	}
	
	// Paginação
	const indexUltimo = paginaAtual * produtosPorPagina;
	const indexPrimeiro = indexUltimo - produtosPorPagina;
	const produtosPagina = produtosFiltrados.slice(indexPrimeiro, indexUltimo);
	const totalPaginas = Math.ceil(produtosFiltrados.length / produtosPorPagina);
	
	return (
		<DashboardLayout>
			<div className="mb-2">
				<h2>Meus Produtos</h2>
				
				{mensagem && (
					<div className={`alert alert-${tipoMensagem}`}>
						{mensagem}
					</div>
				)}
				
				{/* Busca */}
				<div className="d-flex align-items-center mb-2 gap-2">
					<label className="fw-semibold mb-0" style={{ width: "135px" }}>
						Busca Por Nome:
					</label>
					<input
						type="text"
						className="form-control mb-2 w-75"
						placeholder="Busca produto..."
						value={busca}
						onChange={(e) => {
							setBusca(e.target.value);
							setPaginaAtual(1);
						}}
					/>
				</div>
				
				{/* Filtro de preços */}
				<div className="mb-3 d-flex gap-2 align-items-center">
					<select
						className="form-control w-auto"
						value={filtroPreco}
						onChange={(e) => {
							setFiltroPreco(e.target.value);
							setPaginaAtual(1);		
						}}
					>
						<option value="">Filtrar preço</option>
						<option value="maior">Maior preço</option>
						<option value="menor">Menor preço</option>
					</select>
					<button className="btn btn-secondary" onClick={() => setFiltroPreco("")}>
						Limpa filtro
					</button>
				</div>
				
				{/* Formulário */}
				<form onSubmit={handleSubmit} className="card p-3 mb-4">
					<div className="d-flex align-items-center mb-2 gap-2">
						<label className="fw-semibold mb-0" style={{ width: "130px" }}>
							Nome:
						</label>
						<input
							className="form-control mb-2 w-75"
							placeholder="Nome"
							value={nome}
							onChange={(e) => setNome(e.target.value)}
						/>
					</div>
					<div className="d-flex align-items-center mb-2 gap-2">
						<label className="fw-semibold mb-0" style={{ width: "130px" }}>
							Preço:
						</label>
						<input
							type="text"
							className="form-control mb-2 w-75"
							placeholder="Preço (R$ 0,00)"
							value={preco}
							onChange={handlePrecoChange}
						/>
					</div>
					<div className="d-flex align-items-center mb-2 gap-2">
						<label className="fw-semibold mb-0" style={{ width: "130px" }}>
							Categória:
						</label>
						<select
							className="form-control mb-2 w-75"
							value={categoria}
							onChange={(e) => setCategoria(e.target.value)}
						>
							<option value="">Selecione categoria</option>
							{categorias.map((c) => (
								<option key={c.id} value={c.id}>
									{c.nome}
								</option>
							))}
						</select>
					</div>
					<div className="d-flex align-items-center mb-2 gap-2">
						<label className="fw-semibold mb-0" style={{ width: "130px" }}>
							Quantidade:
						</label>
						<input
							type="number"
							className="form-control mb-2 w-75"
							placeholder="Quantidade"
							value={quantidade}
							onChange={(e) => setQuantidade(e.target.value)}
						/>
					</div>
					<div className="d-flex align-items-center mb-2 gap-2">
						<label className="fw-semibold mb-0" style={{ width: "130px" }}>
							Imagem:
						</label>
						<input
							type="file"
							accept="image/*"
							className="form-control mb-2 w-75"
							onChange={handleImagem}
						/>
					</div>
					{preview && <img src={preview} alt="preview" width="120" className="mb-2" />}
					<div className="text-start">
						<button className="btn btn-success">{editadoId ? "atualizar" : "Cadastrar"}</button>
					</div>
				</form>
				
				{/* Tabela */}
				<table className="table table-bordered">
					<thead>
						<tr>
							<th>Imagem</th>
							<th>Nome</th>
							<th>Preço</th>
							<th>Categoria</th>
							<th>Estoque</th>
							<th>Ações</th>
						</tr>
					</thead>
					<tbody>
						{produtosPagina.length === 0 && (
						<tr>
							<td colSpan={6} className="text-center">
								Nenhum produto encontrado
							</td>
						</tr>
						)}
						{produtosPagina.map((p) => (
						<tr key={p.id}>
							<td>
								{p.imagem && <img src={`http://localhost:5000/uploads/${p.imagem}`} width="60" alt={p.nome} />}
							</td>
							<td>{p.nome}</td>
							<td>{formatarPreco(p.preco)}</td>
							<td>{p.categoria || "Sem categoria"}</td>
							<td>{p.quantidade != null ? p.quantidade : 0}</td>
							<td>
								<button type="button" className="btn btn-warning btn-sm me-2" onClick={() => editar(p)}>
									Editar
								</button>
								<button className="btn btn-danger btn-sm" onClick={() => excluir(p.id)}>
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
						<li key={i} className={`page-item ${paginaAtual === i + 1 ? "active" : ""}`}>
							<button className="page-link" onClick={() => setPaginaAtual(i + 1)}>
								{i +1}
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