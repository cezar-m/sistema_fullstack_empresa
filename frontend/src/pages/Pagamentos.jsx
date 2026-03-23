import { useState, useEffect } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/api";

export default function Pagamentos() {

  const [produtos, setProdutos] = useState([]);
  const [vendas, setVendas] = useState([]); // 🔥 CORREÇÃO
  const [formas, setFormas] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);

  const [produtoId, setProdutoId] = useState(""); // (mantido pra não quebrar layout)
  const [vendaId, setVendaId] = useState(""); // 🔥 CORREÇÃO
  const [formaPagamento, setFormaPagamento] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [valor, setValor] = useState(0);

  const [qtdParcelas, setQtdParcelas] = useState(1);
  const [parcelas, setParcelas] = useState([]);

  const [editarPagamento, setEditarPagamento] = useState(null);
  const [novoStatus, setNovoStatus] = useState("pendente");

  const [editarParcela, setEditarParcela] = useState(null);
  const [novoStatusParcela, setNovoStatusParcela] = useState("pendente");

  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);

  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 5;

  const [parcelasTabela, setParcelasTabela] = useState([]);

  useEffect(() => {
    if (mensagem) {
      const timer = setTimeout(() => {
        setMensagem("");
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [mensagem]);

  /* =========================
     LOAD
  ========================= */
  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    try {

      const resProdutos = await api.get("/products/listar");
      setProdutos(resProdutos.data || []);

      const resVendas = await api.get("/vendas"); // 🔥 CORREÇÃO
      setVendas(resVendas.data || []);

      const resFormas = await api.get("/formas-pagamento");
      setFormas(resFormas.data || []);

      const resPag = await api.get("/pagamentos");
      setPagamentos(resPag.data || []);

    } catch (err) {
      console.error(err);
    }
  };

  /* =========================
     CALC VALOR (MANTIDO MAS CORRIGIDO)
  ========================= */
  useEffect(() => {

    // 🔥 CORREÇÃO: agora usa venda ao invés de produto
    const venda = vendas.find(v => Number(v.id) === Number(vendaId));

    if (venda) {
      setValor(Number(venda.total));
    } else {
      setValor(0);
    }

  }, [vendaId, vendas]);

  /* =========================
     GERAR PARCELAS
  ========================= */
  useEffect(() => {

    if (!valor || qtdParcelas <= 1) {
      setParcelas([]);
      return;
    }

    const valorNum = Number(valor);
    const lista = [];
    let soma = 0;

    for (let i = 0; i < qtdParcelas; i++) {

      let valorParcela = Number((valorNum / qtdParcelas).toFixed(2));

      if (i === qtdParcelas - 1) {
        valorParcela = Number((valorNum - soma).toFixed(2));
      }

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

  /* =========================
     CRIAR PAGAMENTO
  ========================= */
  const criarPagamento = async () => {

    // 🔥 CORREÇÃO
    if (!vendaId || !formaPagamento) {
      return setMensagem("Dados incompletos");
    }

    if (loading) return;

    try {
      setLoading(true);

      await api.post("/pagamentos", {
        id_venda: vendaId, // 🔥 CORREÇÃO PRINCIPAL
        id_forma_pagamento: formaPagamento,
        parcelas
      });

      setMensagem("Criado com sucesso");

      setProdutoId("");
      setVendaId(""); // 🔥 CORREÇÃO
      setFormaPagamento("");
      setQuantidade(1);
      setValor(0);
      setQtdParcelas(1);
      setParcelas([]);

      carregar();

    } catch (err) {
      setMensagem(err.response?.data?.erro || "Erro");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     ABRIR PARCELAS
  ========================= */
  const abrirParcelas = async (p) => {
    try {
      const res = await api.get(`/pagamentos/${p.id}/parcelas`);
      setParcelasTabela(res.data || []);
    } catch (err) {
      console.error(err);
      setMensagem("Erro ao carregar parcelas");
    }
  };

  /* =========================
     EDITAR PAGAMENTO
  ========================= */
  const salvarEdicao = async () => {
    try {
      await api.put(`/pagamentos/pago/${editarPagamento.id}`, {
        status: novoStatus,
      });

      setEditarPagamento(null);
      carregar();

    } catch (err) {
      setMensagem("Erro ao editar");
    }
  };

  /* =========================
     EDITAR PARCELA
  ========================= */
  const salvarEdicaoParcela = async () => {
    try {
      await api.put(`/pagamentos/parcelas/${editarParcela.id}`, {
        status: novoStatusParcela
      });

      setEditarParcela(null);

      setParcelasTabela(prev =>
        prev.map(p =>
          p.id === editarParcela.id
            ? { ...p, status: novoStatusParcela }
            : p
        )
      );

    } catch (err) {
      console.error(err);
      setMensagem("Erro ao editar parcela");
    }
  };

  /* =========================
     STATUS COR
  ========================= */
  const getStatusClass = (status) => {
    if (status === "pendente") return "text-danger fw-bold";
    if (status === "pago") return "text-success fw-bold";
    if (status === "cancelado") return "text-secondary fw-bold";
    return "";
  };

  /* =========================
     PAGINAÇÃO
  ========================= */
  const inicio = (pagina - 1) * itensPorPagina;
  const listaPaginada = pagamentos.slice(inicio, inicio + itensPorPagina);

  return (
  <DashboardLayout>

    <div className="container mt-4">

      <h3>Pagamentos</h3>

      {mensagem && (
        <div className="alert alert-info">{mensagem}</div>
      )}

      {/* ================= FORM ================= */}
      <div className="card p-3 mb-3">

        <div className="row g-2">

          {/* ✅ SELECT VENDA COM DETALHES */}
          <div className="col-md-4">
            <select
              className="form-select"
              value={vendaId}
              onChange={(e) => setVendaId(Number(e.target.value))}
            >
              <option value="">Selecione a venda</option>

              {vendas.map(v => (
                <option key={v.id} value={v.id}>
                  #{v.id} - R$ {Number(v.total).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {/* ✅ VALOR */}
          <div className="col-md-2">
            <input
              className="form-control"
              value={`R$ ${Number(valor).toFixed(2)}`}
              readOnly
            />
          </div>

          {/* ✅ FORMA */}
          <div className="col-md-3">
            <select
              className="form-select"
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(Number(e.target.value))}
            >
              <option value="">Forma</option>
              {formas.map(f => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>

          {/* ✅ PARCELAS */}
          <div className="col-md-2">
            <input
              type="number"
              className="form-control"
              value={qtdParcelas}
              onChange={(e) => setQtdParcelas(Number(e.target.value))}
              min="1"
            />
          </div>

        </div>

        <div className="text-center mt-3">
          <button
            className="btn btn-success px-4"
            onClick={criarPagamento}
            disabled={loading}
          >
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </div>

      </div>

      {/* ================= TABELA ================= */}
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Venda</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>
          {listaPaginada.map(p => (
            <tr key={p.id}>
              <td>#{p.venda_id}</td>
              <td>R$ {Number(p.valor).toFixed(2)}</td>
              <td className={getStatusClass(p.status)}>
                {p.status}
              </td>

              <td>
                <button
                  className="btn btn-info btn-sm me-2"
                  onClick={() => abrirParcelas(p)}
                >
                  Parcelas
                </button>

                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setEditarPagamento(p);
                    setNovoStatus(p.status);
                  }}
                >
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ================= PARCELAS ================= */}
      {parcelasTabela.length > 0 && (
        <div className="card mt-4 p-3">
          <h5>Parcelas</h5>

          <table className="table table-bordered">
            <thead>
              <tr>
                <th>#</th>
                <th>Valor</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>

            <tbody>
              {parcelasTabela.map(p => (
                <tr key={p.id}>
                  <td>{p.numero_parcela}</td>
                  <td>R$ {Number(p.valor).toFixed(2)}</td>
                  <td>
                    {new Date(p.data_vencimento)
                      .toLocaleDateString("pt-BR")}
                  </td>
                  <td className={getStatusClass(p.status)}>
                    {p.status}
                  </td>
                  <td>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setEditarParcela(p);
                        setNovoStatusParcela(p.status);
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

      {/* ================= MODAL PAGAMENTO ================= */}
      {editarPagamento && (
        <div className="modal fade show d-block" style={{ background: "#00000088" }}>
          <div className="modal-dialog">
            <div className="modal-content">

              <div className="modal-header">
                <h5>Editar Pagamento</h5>
                <button className="btn-close"
                  onClick={() => setEditarPagamento(null)} />
              </div>

              <div className="modal-body">
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
                <button className="btn btn-secondary"
                  onClick={() => setEditarPagamento(null)}>
                  Fechar
                </button>

                <button className="btn btn-primary"
                  onClick={salvarEdicao}>
                  Salvar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL PARCELA ================= */}
      {editarParcela && (
        <div className="modal fade show d-block" style={{ background: "#00000088" }}>
          <div className="modal-dialog">
            <div className="modal-content">

              <div className="modal-header">
                <h5>Editar Parcela</h5>
                <button className="btn-close"
                  onClick={() => setEditarParcela(null)} />
              </div>

              <div className="modal-body">
                <select
                  className="form-select"
                  value={novoStatusParcela}
                  onChange={(e) => setNovoStatusParcela(e.target.value)}
                >
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary"
                  onClick={() => setEditarParcela(null)}>
                  Fechar
                </button>

                <button className="btn btn-primary"
                  onClick={salvarEdicaoParcela}>
                  Salvar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>

  </DashboardLayout>
);
}
