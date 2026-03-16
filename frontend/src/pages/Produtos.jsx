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

  const [busca, setBusca] = useState("");
  const [filtroPreco, setFiltroPreco] = useState("");

  const [paginaAtual, setPaginaAtual] = useState(1);
  const produtosPorPagina = 12;

  // API_URL dinâmico
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Carrega produtos e categorias
  useEffect(() => {
    carregarProdutos();
    carregarCategorias();
  }, []);

  // Limpa mensagem após 3s
  useEffect(() => {
    if (!mensagem) return;
    const timer = setTimeout(() => setMensagem(""), 3000);
    return () => clearTimeout(timer);
  }, [mensagem]);

  // Limpa preview antigo
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Formata preço
  const formatarPreco = (valor) => {
    if (valor == null || isNaN(valor)) return "R$ 0,00";
    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const [preco, setPreco] = useState(""); // Para exibir no input
  const [precoNumerico, setPrecoNumerico] = useState(0); // Valor real para enviar

  const handlePrecoChange = (e) => {
    let valor = e.target.value.replace(/\D/g, ""); // só números
    if (!valor) {
      setPreco("");
      setPrecoNumerico(0);
      return;
    }
    const numero = parseInt(valor); // valor em centavos
    setPreco((numero / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }));
    setPrecoNumerico(numero / 100); // envia decimal real
  };

  // Carrega produtos do usuário
  const carregarProdutos = async () => {
    try {
      const res = await api.get("/products/meus");
      const lista = Array.isArray(res.data) ? res.data : [];
      const produtosComPreco = lista.map((p) => ({
        ...p,
        preco: p.preco != null ? Number(p.preco) : 0,
      }));
      setProdutos(produtosComPreco);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.erro || "Erro ao carregar produtos");
    }
  };

  // Carrega categorias
  const carregarCategorias = async () => {
    try {
      const res = await api.get("/categorias");
      setCategorias(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.erro || "Erro ao carregar categorias");
    }
  };

  // Seleciona imagem
  const handleImagem = (e) => {
    const file = e.target.files[0];
    setImagem(file);
    if (file) setPreview(URL.createObjectURL(file));
  };

  // Limpa formulário
  const limpar = () => {
    setNome("");
    setPreco("");
    setCategoria("");
    setQuantidade("");
    setImagem(null);
    setPreview(null);
    setEditadoId(null);
  };

  // Criar ou atualizar produto
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nome || !preco || !categoria) {
      alert("Nome, preço e categoria são obrigatórios");
      return;
    }

    const formData = new FormData();
    formData.append("nome", nome);

    const precoNumerico = Number(preco.toString().replace(",", "."));
    formData.append("preco", precoNumerico);
    formData.append("categoria", categoria);
    formData.append("quantidade", quantidade || 0);

    if (imagem) formData.append("imagem", imagem);

    try {
      if (editadoId) {
        await api.put(`/products/${editadoId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setMensagem("Produto atualizado com sucesso!");
      } else {
        await api.post("/products", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setMensagem("Produto cadastrado com sucesso!");
      }

      setTipoMensagem("success");
      limpar();
      carregarProdutos();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.erro || "Erro ao salvar produto");
    }
  };

  // Editar produto
  const editar = (p) => {
    setNome(p.nome);
    setPreco(p.preco != null ? p.preco.toFixed(2) : "");
    setCategoria(p.id_categoria || "");
    setQuantidade(p.quantidade ?? "");
    setPreview(p.imagem ? `${API_URL}/uploads/${p.imagem}` : null);
    setImagem(null);
    setEditadoId(p.id);
  };

  // Excluir produto
  const excluir = async (id) => {
    if (!window.confirm("Deseja excluir este produto?")) return;

    try {
      await api.delete(`/products/${id}`);
      setMensagem("Produto excluído");
      setTipoMensagem("danger");
      carregarProdutos();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.erro || "Erro ao excluir produto");
    }
  };

  // Filtro e busca
  let produtosFiltrados = produtos.filter((p) =>
    (p.nome || "").toLowerCase().includes(busca.toLowerCase())
  );

  if (filtroPreco === "maior" && produtosFiltrados.length > 0) {
    const maxPreco = Math.max(...produtosFiltrados.map((p) => p.preco));
    produtosFiltrados = produtosFiltrados.filter((p) => p.preco === maxPreco);
  } else if (filtroPreco === "menor" && produtosFiltrados.length > 0) {
    const minPreco = Math.min(...produtosFiltrados.map((p) => p.preco));
    produtosFiltrados = produtosFiltrados.filter((p) => p.preco === minPreco);
  }

  const indexUltimo = paginaAtual * produtosPorPagina;
  const indexPrimeiro = indexUltimo - produtosPorPagina;
  const produtosPagina = produtosFiltrados.slice(indexPrimeiro, indexUltimo);
  const totalPaginas = Math.ceil(produtosFiltrados.length / produtosPorPagina);

  return (
    <DashboardLayout>
      <div className="mb-2">
        <h2>Meus Produtos</h2>

        {mensagem && (
          <div className={`alert alert-${tipoMensagem}`}>{mensagem}</div>
        )}

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

          <button
            className="btn btn-secondary"
            onClick={() => setFiltroPreco("")}
          >
            Limpa filtro
          </button>
        </div>

        <form onSubmit={handleSubmit} className="card p-3 mb-4">
          <input
            className="form-control mb-2"
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />

          <input
            type="text"
            className="form-control mb-2"
            placeholder="Preço (R$)"
            value={preco}
            onChange={handlePrecoChange}
          />

          <select
            className="form-control mb-2"
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

          <input
            type="number"
            className="form-control mb-2"
            placeholder="Quantidade"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />

          <input
            type="file"
            className="form-control mb-2"
            onChange={handleImagem}
          />

          {preview && (
            <img src={preview} alt="preview" width="120" className="mb-2" />
          )}

          <button className="btn btn-success">
            {editadoId ? "Atualizar Produto" : "Cadastrar Produto"}
          </button>
        </form>

        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Imagem</th>
              <th>Nome</th>
              <th>Preço</th>
              <th>Categoria</th>
              <th>Quantidade</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {produtosPagina.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.imagem && (
                    <img
                      src={`${API_URL}/uploads/${p.imagem}`}
                      width="60"
                      alt={p.nome}
                    />
                  )}
                </td>
                <td>{p.nome}</td>
                <td>{formatarPreco(p.preco)}</td>
                <td>{p.categoria || "Sem categoria"}</td>
                <td>{p.quantidade}</td>
                <td>
                  <button
                    className="btn btn-warning btn-sm me-2"
                    onClick={() => editar(p)}
                  >
                    Editar
                  </button>

                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => excluir(p.id)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

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
