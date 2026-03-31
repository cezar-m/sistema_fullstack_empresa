import { useState, useEffect } from "react";
import api from "../api/api";
import DashboardLayout from "../layouts/DashboardLayout";

export default function PaginaVendas() {
  const [produtos, setProdutos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [itens, setItens] = useState([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("");

  const vendasPorPagina = 10;

  useEffect(() => {
    listarProdutos();
    listarVendas();
  }, []);

  useEffect(() => {
    if (!mensagem) return;
    const timer = setTimeout(() => setMensagem(""), 3000);
    return () => clearTimeout(timer);
  }, [mensagem]);

  const listarProdutos = async () => {
    try {
      const res = await api.get("/products/listar");
      setProdutos(Array.isArray(res.data) ? res.data : []);
    } catch {
      setMensagem("Erro ao carregar produtos");
      setTipoMensagem("erro");
    }
  };

  const listarVendas = async () => {
    try {
      const res = await api.get("/vendas");
      setVendas(Array.isArray(res.data) ? res.data : []);
    } catch {
      setVendas([]);
    }
  };

  const adicionarItem = () => {
    const id = Number(produtoSelecionado);
    const qtd = Number(quantidade);
    if (!id || qtd <= 0) {
      setMensagem("Produto ou quantidade inválida");
      setTipoMensagem("erro");
      return;
    }

    const produto = produtos.find(p => p.id === id);
    if (!produto || produto.quantidade < qtd) {
      setMensagem("Estoque insuficiente");
      setTipoMensagem("erro");
      return;
    }

    const existente = itens.find(i => i.id_produto === id);
    if (existente) {
      setItens(prev => prev.map(i => i.id_produto === id ? { ...i, quantidade: i.quantidade + qtd } : i));
    } else {
      setItens(prev => [...prev, { id_produto: id, nome: produto.nome, preco: Number(produto.preco), quantidade: qtd }]);
    }

    setProdutoSelecionado("");
    setQuantidade(1);
  };

  const criarVenda = async () => {
    if (itens.length === 0) {
      setMensagem("Adicione itens antes de finalizar");
      setTipoMensagem("erro");
      return;
    }

    try {
      await api.post("/vendas", { itens });
      setItens([]);
      await listarProdutos();
      await listarVendas();
      setMensagem("Venda realizada com sucesso!");
      setTipoMensagem("sucesso");
    } catch (err) {
      setMensagem(err.response?.data?.erro || "Erro ao criar venda");
      setTipoMensagem("erro");
    }
  };

  const calcularTotal = venda => {
    if (!Array.isArray(venda.itens)) return 0;
    return venda.itens.reduce((acc, i) => acc + i.preco * i.quantidade, 0);
  };

  const totalPorProduto = () => {
    const total = {};
    vendas.forEach(venda => {
      venda.itens.forEach(i => {
        total[i.produto] = (total[i.produto] || 0) + i.quantidade;
      });
    });
    return Object.entries(total).map(([produto, quantidade]) => ({ produto, quantidade }));
  };

  const totalPaginas = Math.ceil(vendas.length / vendasPorPagina);
  const vendasPagina = vendas.slice((paginaAtual - 1) * vendasPorPagina, paginaAtual * vendasPorPagina);

  return (
    <DashboardLayout>
      <div className="container mt-4">
        {mensagem && <div className={`alert mt-3 ${tipoMensagem === "sucesso" ? "alert-success" : "alert-danger"}`}>{mensagem}</div>}
        <div className="card shadow mb-4">
          <div className="card-header bg-primary text-white fw-bold">Nova Venda</div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label>Produto:</label>
                <select className="form-select" value={produtoSelecionado} onChange={e => setProdutoSelecionado(e.target.value)}>
                  <option value="">Selecione</option>
                  {produtos.map(p => <option key={p.id} value={p.id} disabled={p.quantidade <= 0}>{p.nome} - R$ {Number(p.preco).toFixed(2)} (Estoque: {p.quantidade})</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <label>Quantidade:</label>
                <input type="number" min="1" className="form-control" value={quantidade} onChange={e => setQuantidade(Number(e.target.value))} />
              </div>
              <div className="col-md-3 d-flex align-items-end">
                <button className="btn btn-success w-100" onClick={adicionarItem}>Adicionar</button>
              </div>
            </div>

            {itens.length > 0 && <div className="mt-3">
              <h6>Itens adicionados:</h6>
              {itens.map((i, idx) => <div key={idx}>{i.nome} - {i.quantidade}x - R$ {(i.preco * i.quantidade).toFixed(2)}</div>)}
            </div>}

            <div className="text-center mt-3">
              <button className="btn btn-success" onClick={criarVenda} disabled={itens.length === 0}>Finalizar Venda</button>
            </div>
          </div>
        </div>

        <div className="card shadow">
          <div className="card-header bg-dark text-white fw-bold">Minhas Vendas</div>
          <div className="card-body">
            {vendas.length === 0 ? <p>Nenhuma venda encontrada</p> :
              <>
                <div className="table-responsive">
                  <table className="table table-bordered table-hover">
                    <thead className="table-light"><tr><th>Data</th><th>Produtos</th><th>Total</th></tr></thead>
                    <tbody>
                      {vendasPagina.map(v => <tr key={v.id}>
                        <td>{new Date(v.data_venda).toLocaleDateString("pt-BR")}</td>
                        <td>{v.itens.map((i, idx) => <div key={idx}>{i.produto} - {i.quantidade}x</div>)}</td>
                        <td className="fw-bold text-success">R$ {Number(v.total).toFixed(2)}</td>
                      </tr>)}
                    </tbody>
                  </table>
                </div>
                {totalPaginas > 1 && <div className="d-flex justify-content-center mt-3">
                  {Array.from({ length: totalPaginas }).map((_, idx) => <button key={idx} className={`btn btn-sm mx-1 ${paginaAtual === idx + 1 ? "btn-success" : "btn-outline-secondary"}`} onClick={() => setPaginaAtual(idx + 1)}>{idx + 1}</button>)}
                </div>}
              </>
            }
          </div>
        </div>

        <div className="card shadow mt-4">
          <div className="card-header bg-info text-white fw-bold">Total Vendido por Produto</div>
          <div className="card-body">
            <table className="table table-bordered">
              <thead><tr><th>Produto</th><th>Quantidade</th></tr></thead>
              <tbody>{totalPorProduto().map((i, idx) => <tr key={idx}><td>{i.produto}</td><td>{i.quantidade}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        
      </div>
    </DashboardLayout>
  );
}
