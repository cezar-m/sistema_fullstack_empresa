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

  // ========================= CARREGAR DADOS =========================
  const carregar = async () => {
    try {
      const resProd = await api.get("/products/listar");
      setProdutos(Array.isArray(resProd.data) ? resProd.data : []);
    } catch (err) {
      console.error("Erro produtos:", err);
      setMensagem("Erro ao carregar produtos");
      setTipoMensagem("erro");
    }

    try {
      const resVenda = await api.get("/vendas");
      setVendas(Array.isArray(resVenda.data) ? resVenda.data : []);
    } catch (err) {
      console.error("Erro vendas:", err);
      setVendas([]);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  // ========================= ADICIONAR ITEM =========================
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

    setItens([
      ...itens,
      {
        id_produto: Number(produto.id),
        nome: produto.nome,
        preco: Number(produto.preco),
        quantidade: Number(quantidade)
      }
    ]);

    setProdutoSelecionado("");
    setQuantidade(1);
  };

  // ========================= CRIAR VENDA =========================
  const criarVenda = async () => {
    if (itens.length === 0) {
      setMensagem("Adicione itens antes de finalizar");
      setTipoMensagem("erro");
      return;
    }

    try {
      await api.post("/vendas", { itens });

      setItens([]);
      setMensagem("Venda realizada com sucesso!");
      setTipoMensagem("sucesso");

      carregar();
    } catch (err) {
      console.error(err);
      setMensagem(err.response?.data?.erro || "Erro ao criar venda");
      setTipoMensagem("erro");
    }
  };

  // ========================= CALCULAR TOTAL =========================
  const calcularTotal = (venda) => {
    if (!Array.isArray(venda.itens)) return 0;

    return venda.itens.reduce((acc, item) => {
      return acc + (Number(item.preco || 0) * Number(item.quantidade || 0));
    }, 0);
  };

  return (
    <DashboardLayout>
      <div className="container mt-4">

        {/* ================= NOVA VENDA ================= */}
        <div className="card mb-4 shadow">
          <div className="card-header bg-primary text-white">
            Nova Venda
          </div>

          <div className="card-body">
            <div className="row g-3">

              <div className="col-md-6">
                <select
                  className="form-select"
                  value={produtoSelecionado}
                  onChange={(e) => setProdutoSelecionado(e.target.value)}
                >
                  <option value="">Selecione um produto</option>
                  {produtos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome} - R$ {Number(p.preco).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <input
                  type="number"
                  className="form-control"
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                />
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

            {/* ITENS */}
            {itens.length > 0 && (
              <div className="mt-3">
                <h6>Itens:</h6>
                {itens.map((i, idx) => (
                  <div key={idx}>
                    {i.nome} - {i.quantidade}x - R$ {(i.preco * i.quantidade).toFixed(2)}
                  </div>
                ))}
              </div>
            )}

            <div className="text-center mt-3">
              <button
                className="btn btn-primary"
                onClick={criarVenda}
                disabled={itens.length === 0}
              >
                Finalizar Venda
              </button>
            </div>
          </div>
        </div>

        {/* ================= LISTA DE VENDAS ================= */}
        <div className="card shadow">
          <div className="card-header bg-dark text-white">
            Minhas Vendas
          </div>

          <div className="card-body">

            {vendas.length === 0 ? (
              <p>Nenhuma venda encontrada</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Data</th>
                      <th>Produtos</th>
                      <th>Restante</th>
                      <th>Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {vendas.map(v => (
                      <tr key={v.id}>

                        <td>
                          {new Date(v.data_venda).toLocaleDateString("pt-BR")}
                        </td>

                        {/* PRODUTOS */}
                        <td>
                          {v.itens?.map((item, i) => (
                            <div key={i}>
                              {item.produto} ({item.quantidade}x)
                            </div>
                          ))}
                        </td>

                        {/* 🔥 RESTANTE (NOVO) */}
                        <td className="text-danger fw-bold">
                          {v.itens?.map((item, i) => (
                            <div key={i}>
                              {item.quantidade_restante}x
                            </div>
                          ))}
                        </td>

                        {/* TOTAL */}
                        <td className="text-success fw-bold">
                          R$ {Number(v.total).toFixed(2)}
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ================= ALERTA ================= */}
        {mensagem && (
          <div className={`alert mt-3 ${tipoMensagem === "sucesso" ? "alert-success" : "alert-danger"}`}>
            {mensagem}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
