import { useState, useEffect } from "react";
import api from "../api/api";
import DashboardLayout from "../layouts/DashboardLayout";

export default function PaginaVendas() {
  const [produtos, setProdutos] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [itens, setItens] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("");

  // Buscar produtos e vendas
  useEffect(() => {
    const fetchData = async () => {
      try {
        const resProd = await api.get("/products");
        setProdutos(Array.isArray(resProd.data) ? resProd.data : []);
      } catch (err) {
        console.error("Erro ao buscar produtos:", err);
        setMensagem("Erro ao carregar produtos");
        setTipoMensagem("erro");
      }

      try {
        const resVendas = await api.get("/vendas");
        setVendas(Array.isArray(resVendas.data) ? resVendas.data : []);
      } catch (err) {
        console.error("Erro ao listar vendas:", err);
        setVendas([]);
      }
    };

    fetchData();
  }, []);

  // Adicionar item
  const adicionarItem = () => {
    if (!produtoSelecionado || quantidade <= 0) {
      setMensagem("Selecione produto e quantidade válida");
      setTipoMensagem("erro");
      return;
    }

    const produto = produtos.find(p => p.id === Number(produtoSelecionado));
    if (!produto) {
      setMensagem("Produto inválido");
      setTipoMensagem("erro");
      return;
    }

    setItens([...itens, {
      id_produto: produto.id,
      nome: produto.nome,
      preco: Number(produto.preco),
      quantidade: Number(quantidade)
    }]);

    setProdutoSelecionado("");
    setQuantidade(1);
  };

  // Criar venda
  const criarVenda = async () => {
    if (itens.length === 0) {
      setMensagem("Adicione itens antes de finalizar");
      setTipoMensagem("erro");
      return;
    }

    try {
      await api.post("/vendas", { itens });
      setItens([]);
      const resVendas = await api.get("/vendas");
      setVendas(Array.isArray(resVendas.data) ? resVendas.data : []);
      setMensagem("Venda realizada com sucesso!");
      setTipoMensagem("sucesso");
    } catch (err) {
      console.error("Erro ao criar venda:", err);
      setMensagem(err.response?.data?.erro || "Erro ao criar venda");
      setTipoMensagem("erro");
    }
  };

  const calcularTotal = venda => {
    if (!Array.isArray(venda.itens)) return 0;
    return venda.itens.reduce((acc, i) => acc + (Number(i.preco) || 0) * (Number(i.quantidade) || 0), 0);
  };

  return (
    <DashboardLayout>
      <div className="container mt-4">

        <div className="card mb-4">
          <div className="card-header">Nova Venda</div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <select className="form-select" value={produtoSelecionado} onChange={e => setProdutoSelecionado(e.target.value)}>
                  <option value="">Selecione um produto</option>
                  {produtos.map(p => (
                    <option key={p.id} value={p.id}>{p.nome} - R$ {Number(p.preco).toFixed(2)}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <input type="number" className="form-control" min="1" value={quantidade} onChange={e => setQuantidade(Number(e.target.value))} />
              </div>
              <div className="col-md-3">
                <button className="btn btn-success w-100" onClick={adicionarItem}>Adicionar</button>
              </div>
            </div>

            {itens.length > 0 && (
              <div className="mt-2">
                {itens.map((i, idx) => (
                  <div key={idx}>{i.nome} - {i.quantidade}x - R$ {(i.preco*i.quantidade).toFixed(2)}</div>
                ))}
              </div>
            )}

            <button className="btn btn-primary mt-3" onClick={criarVenda} disabled={itens.length===0}>Finalizar Venda</button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">Minhas Vendas</div>
          <div className="card-body">
            {vendas.length===0 ? <p>Nenhuma venda encontrada</p> :
              <table className="table">
                <thead><tr><th>Data</th><th>Produtos</th><th>Total</th></tr></thead>
                <tbody>
                  {vendas.map(v => (
                    <tr key={v.id}>
                      <td>{new Date(v.data_venda).toLocaleDateString("pt-BR")}</td>
                      <td>{v.itens?.map(it => `${it.produto || it.nome} x${it.quantidade}`).join(", ")}</td>
                      <td>R$ {calcularTotal(v).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          </div>
        </div>

        {mensagem && <div className={`alert mt-3 ${tipoMensagem==="sucesso"?"alert-success":"alert-danger"}`}>{mensagem}</div>}
      </div>
    </DashboardLayout>
  );
}
