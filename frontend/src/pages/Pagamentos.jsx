import { useState, useEffect } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/api";

export default function Pagamentos() {
  const [produtos, setProdutos] = useState([]);
  const [formas, setFormas] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);

  const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [formaPagamento, setFormaPagamento] = useState("");

  const [valor, setValor] = useState(0);
  const [qtdParcelas, setQtdParcelas] = useState(1);
  const [parcelas, setParcelas] = useState([]);
  const [parcelasTabela, setParcelasTabela] = useState([]);

  const [editarPagamento, setEditarPagamento] = useState(null);
  const [novoStatus, setNovoStatus] = useState("pendente");
  const [editarParcela, setEditarParcela] = useState(null);
  const [novoStatusParcela, setNovoStatusParcela] = useState("pendente");

  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);

  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 5;

  /* ========================= LOAD ========================= */
  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    try {
      const resProdutos = await api.get("/products/listar");
      setProdutos(resProdutos.data || []);

      const resFormas = await api.get("/formas-pagamento");
      setFormas(resFormas.data || []);

      const resPag = await api.get("/pagamentos");
      setPagamentos(resPag.data || []);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    }
  };

  /* ========================= CALC VALOR ========================= */
  useEffect(() => {
    const produto = produtos.find(p => Number(p.id) === Number(produtoId));
    setValor(produto ? Number(produto.preco) * quantidade : 0);
  }, [produtoId, quantidade, produtos]);

  /* ========================= GERAR PARCELAS ========================= */
  useEffect(() => {
    if (!valor || qtdParcelas <= 1) {
      setParcelas([]);
      return;
    }

    const lista = [];
    let soma = 0;

    for (let i = 0; i < qtdParcelas; i++) {
      let valorParcela = Number((valor / qtdParcelas).toFixed(2));
      if (i === qtdParcelas - 1) valorParcela = Number((valor - soma).toFixed(2));
      soma += valorParcela;

      const venc = new Date();
      venc.setMonth(new Date().getMonth() + i + 1);

      lista.push({
        numero: i + 1,
        valor: valorParcela,
        data_vencimento: venc.toISOString().split("T")[0],
      });
    }

    setParcelas(lista);
  }, [qtdParcelas, valor]);

  /* ========================= CRIAR PAGAMENTO ========================= */
  const criarPagamento = async () => {
    if (!produtoId || !formaPagamento) return setMensagem("Preencha tudo");

    try {
      setLoading(true);

      // 🔥 cria venda CORRIGIDO (envia itens)
      const venda = await api.post("/vendas", {
        itens: [{ id_produto: Number(produtoId), quantidade }],
      });

      const id_venda = venda.data.id;

      // 🔥 cria pagamento
      await api.post("/pagamentos", {
        id_venda,
        id_forma_pagamento: Number(formaPagamento),
        parcelas,
      });

      setMensagem("Venda e pagamento cadastrados com sucesso!");
      setProdutoId("");
      setQuantidade(1);
      setFormaPagamento("");
      setQtdParcelas(1);
      setParcelas([]);

      carregar();
    } catch (err) {
      console.error("Erro criarPagamento:", err);
      setMensagem(err.response?.data?.erro || "Erro ao criar pagamento");
    } finally {
      setLoading(false);
    }
  };

  /* ========================= ABRIR PARCELAS ========================= */
  const abrirParcelas = async (p) => {
    try {
      const res = await api.get(`/pagamentos/${p.id}/parcelas`);
      setParcelasTabela(res.data || []);
    } catch {
      setMensagem("Erro ao carregar parcelas");
    }
  };

  /* ========================= EDITAR PAGAMENTO ========================= */
  const salvarEdicao = async () => {
    try {
      await api.put(`/pagamentos/pago/${editarPagamento.id}`, { status: novoStatus });
      setEditarPagamento(null);
      carregar();
    } catch {
      setMensagem("Erro ao editar pagamento");
    }
  };

  /* ========================= EDITAR PARCELA ========================= */
  const salvarEdicaoParcela = async () => {
    try {
      await api.put(`/pagamentos/parcelas/${editarParcela.id}`, { status: novoStatusParcela });
      setEditarParcela(null);
      setParcelasTabela(prev =>
        prev.map(p => (p.id === editarParcela.id ? { ...p, status: novoStatusParcela } : p))
      );
    } catch {
      setMensagem("Erro ao editar parcela");
    }
  };

  const getStatusClass = (status) => {
    if (status === "pendente") return "text-danger fw-bold";
    if (status === "pago") return "text-success fw-bold";
    if (status === "cancelado") return "text-secondary fw-bold";
    return "";
  };

  /* ========================= PAGINAÇÃO ========================= */
  const inicio = (pagina - 1) * itensPorPagina;
  const listaPaginada = pagamentos.slice(inicio, inicio + itensPorPagina);

  return (
    <DashboardLayout>
      <div className="container mt-4">
        <h3>Pagamentos</h3>
        {mensagem && <div className="alert alert-info">{mensagem}</div>}

        {/* ================= FORMULARIO ================= */}
        <div className="card p-3 mb-3">
          <div className="row g-2">
            <div className="col-md-3">
              <select className="form-select" value={produtoId} onChange={(e) => setProdutoId(e.target.value)}>
                <option value="">Produto</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome} - R$ {p.preco}</option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <input type="number" className="form-control" value={quantidade} min="1" onChange={(e) => setQuantidade(Number(e.target.value))} />
            </div>

            <div className="col-md-2">
              <input className="form-control" value={`R$ ${valor.toFixed(2)}`} readOnly />
            </div>

            <div className="col-md-3">
              <select className="form-select" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
                <option value="">Forma</option>
                {formas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>

            <div className="col-md-2">
              <input type="number" className="form-control" value={qtdParcelas} min="1" onChange={(e) => setQtdParcelas(Number(e.target.value))} />
            </div>
          </div>

          <div className="text-center mt-3">
            <button className="btn btn-success" onClick={criarPagamento} disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>

       {/* ================= TABELA DE PAGAMENTOS ================= */}
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {listaPaginada.map(p => (
              <tr key={p.id}>
                {/* Pega o nome do produto do item_venda */}
                <td>{p.itens && p.itens.length > 0 ? p.itens.map(i => i.produto).join(", ") : "-"}</td>
                <td>R$ {Number(p.valor).toFixed(2)}</td>
                <td className={getStatusClass(p.status)}>{p.status}</td>
                <td>
                  <button className="btn btn-info btn-sm me-2" onClick={() => abrirParcelas(p)}>Parcelas</button>
                  <button className="btn btn-primary btn-sm" onClick={() => { setEditarPagamento(p); setNovoStatus(p.status); }}>Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* ================= TABELA DE PARCELAS ================= */}
        {parcelasTabela.length > 0 && (
          <div className="card p-3 mt-3">
            <h5>Parcelas</h5>
            <table className="table">
              <thead>
                <tr>
                  <th>Nº Parcela</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {parcelasTabela.map(p => (
                  <tr key={p.id}>
                    <td>{p.numero_parcela}</td>
                     {/* Pega o nome do produto do item_venda */}
                    <td>{p.itens && p.itens.length > 0 ? p.itens.map(i => i.produto).join(", ") : "-"}</td>
                    <td>R$ {Number(p.valor).toFixed(2)}</td>
                    <td className={getStatusClass(p.status)}>{p.status}</td>
                    <td>
                      <button className="btn btn-primary btn-sm" onClick={() => { setEditarParcela(p); setNovoStatusParcela(p.status); }}>Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}


        {/* ================= MODAL PAGAMENTO ================= */}
        {editarPagamento && (
          <div className="modal d-block" style={{ background: "#0008" }}>
            <div className="modal-dialog">
              <div className="modal-content p-3">
                <h5>Editar Pagamento</h5>
                <select className="form-select" value={novoStatus} onChange={(e) => setNovoStatus(e.target.value)}>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </select>
                <div className="mt-3">
                  <button className="btn btn-secondary me-2" onClick={() => setEditarPagamento(null)}>Fechar</button>
                  <button className="btn btn-primary" onClick={salvarEdicao}>Salvar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL PARCELA ================= */}
        {editarParcela && (
          <div className="modal d-block" style={{ background: "#0008" }}>
            <div className="modal-dialog">
              <div className="modal-content p-3">
                <h5>Editar Parcela</h5>
                <select className="form-select" value={novoStatusParcela} onChange={(e) => setNovoStatusParcela(e.target.value)}>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </select>
                <div className="mt-3">
                  <button className="btn btn-secondary me-2" onClick={() => setEditarParcela(null)}>Fechar</button>
                  <button className="btn btn-primary" onClick={salvarEdicaoParcela}>Salvar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
