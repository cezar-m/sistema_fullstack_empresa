import { useState, useEffect } from "react";
import api from "../api/api";
import DashboardLayout from "../layouts/DashboardLayout";

export default function PaginaVendas() {
  const [produtos, setProdutos] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [itens, setItens] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("");

  const vendasPorPagina = 10;

  // ================= ALERTA =================
  useEffect(() => {
    if (!mensagem) return;
    const timer = setTimeout(() => setMensagem(""), 3000);
    return () => clearTimeout(timer);
  }, [mensagem]);

  // ================= PRODUTOS =================
  const listarProdutos = async () => {
    try {
      const res = await api.get("/products/listar");
      console.log("PRODUTOS:", res.data);
      setProdutos(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Erro ao buscar produtos:", err);
      setMensagem("Erro ao carregar produtos");
      setTipoMensagem("erro");
    }
  };

  // ================= VENDAS =================
  const listarVendas = async () => {
    try {
      const res = await api.get("/vendas");
      setVendas(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Erro ao listar vendas:", err);
      setVendas([]);
    }
  };

  useEffect(() => {
    listarProdutos();
    listarVendas();
  }, []);

  // ================= ADICIONAR ITEM =================
  const adicionarItem = () => {
    const id = Number(produtoSelecionado);
    const qtd = Number(quantidade);

    if (!id || isNaN(qtd) || qtd <= 0) {
      setMensagem("Produto ou quantidade inválida");
      setTipoMensagem("erro");
      return;
    }

    const produtoObj = produtos.find(p => p.id === id);

    if (!produtoObj) {
      setMensagem("Produto não encontrado");
      setTipoMensagem("erro");
      return;
    }

    setItens(prev => [
      ...prev,
      {
        id_produto: id,
        nome: produtoObj.nome,
        preco: Number(produtoObj.preco),
        quantidade: qtd
      }
    ]);

    setProdutoSelecionado("");
    setQuantidade(1);
  };

  // ================= CRIAR VENDA =================
  const criarVenda = async () => {
    if (itens.length === 0) {
      setMensagem("Adicione itens antes de finalizar");
      setTipoMensagem("erro");
      return;
    }

    console.log("ENVIANDO ITENS:", itens);

    try {
      await api.post("/vendas", { itens });

      setItens([]);
      await listarVendas();
      setPaginaAtual(1);

      setMensagem("Venda realizada com sucesso!");
      setTipoMensagem("sucesso");
    } catch (err) {
      console.error("Erro criar venda:", err.response?.data);
      setMensagem(err.response?.data?.erro || "Erro ao criar venda");
      setTipoMensagem("erro");
    }
  };

  // ================= TOTAL VENDA =================
  const calcularTotal = (venda) => {
    if (venda.total) return Number(venda.total);
    if (!Array.isArray(venda.itens)) return 0;

    return venda.itens.reduce((acc, i) => {
      return acc + (Number(i.preco) || 0) * (Number(i.quantidade) || 0);
    }, 0);
  };

  // ================= TOTAL POR PRODUTO =================
  const totalVendidoPorProduto = () => {
    const total = {};

    vendas.forEach(venda => {
      if (!Array.isArray(venda.itens)) return;

      venda.itens.forEach(item => {
        const nome = item.produto || item.nome;
        total[nome] = (total[nome] || 0) + Number(item.quantidade || 0);
      });
    });

    return Object.entries(total).map(([produto, quantidade]) => ({
      produto,
      quantidade
    }));
  };

  // ================= PAGINAÇÃO =================
  const totalPaginas = Math.ceil(vendas.length / vendasPorPagina);

  const vendasPagina = vendas.slice(
    (paginaAtual - 1) * vendasPorPagina,
    paginaAtual * vendasPorPagina
  );

  // ================= RENDER =================
  return (
    <DashboardLayout>
      <div className="container mt-4">

        {/* NOVA VENDA */}
        <div className="card shadow mb-4">
          <div className="card-header bg-primary text-white fw-bold">
            Nova Venda
          </div>

          <div className="card-body">
            <div className="row g-3">

              <div className="col-md-6">
                <label>Produto:</label>
                <select
                  className="form-select"
                  value={produtoSelecionado}
                  onChange={(e) => setProdutoSelecionado(e.target.value)}
                >
                  <option value="">Selecione</option>

                  {produtos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome} - R$ {Number(p.preco).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label>Quantidade:</label>
                <input
                  type="number"
                  className="form-control"
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                />
              </div>

              <div className="col-md-3 d-flex align-items-end">
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
                <h6>Itens adicionados:</h6>

                {itens.map((i, idx) => (
                  <div key={idx}>
                    {i.nome} - {i.quantidade}x - R$ {(i.preco * i.quantidade).toFixed(2)}
                  </div>
                ))}
              </div>
            )}

            <div className="text-center mt-3">
              <button
                className="btn btn-success"
                onClick={criarVenda}
                disabled={itens.length === 0}
              >
                Finalizar Venda
              </button>
            </div>
          </div>
        </div>

        {/* LISTA DE VENDAS */}
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
                      {vendasPagina.map(venda => (
                        <tr key={venda.id}>
                          <td>
                            {new Date(venda.data_venda).toLocaleDateString("pt-BR")}
                          </td>

                          <td>
                            {Array.isArray(venda.itens) &&
                              venda.itens.map((item, idx) => (
                                <div key={idx}>
                                  {item.produto || item.nome} - {item.quantidade}x
                                </div>
                              ))}
                          </td>

                          <td className="fw-bold text-success">
                            R$ {calcularTotal(venda).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* PAGINAÇÃO */}
                {totalPaginas > 1 && (
                  <div className="d-flex justify-content-center mt-3">
                    {Array.from({ length: totalPaginas }).map((_, idx) => (
                      <button
                        key={idx}
                        className={`btn btn-sm mx-1 ${
                          paginaAtual === idx + 1
                            ? "btn-success"
                            : "btn-outline-secondary"
                        }`}
                        onClick={() => setPaginaAtual(idx + 1)}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* TOTAL POR PRODUTO */}
        <div className="card shadow mt-4">
          <div className="card-header bg-info text-white fw-bold">
            Total Vendido por Produto
          </div>

          <div className="card-body">
            {vendas.length === 0 ? (
              <p>Nenhuma venda ainda</p>
            ) : (
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Quantidade</th>
                  </tr>
                </thead>

                <tbody>
                  {totalVendidoPorProduto().map((i, idx) => (
                    <tr key={idx}>
                      <td>{i.produto}</td>
                      <td>{i.quantidade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ALERTA */}
        {mensagem && (
          <div
            className={`alert mt-3 ${
              tipoMensagem === "sucesso"
                ? "alert-success"
                : "alert-danger"
            }`}
          >
            {mensagem}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
