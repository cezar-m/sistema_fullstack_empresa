import { useState, useEffect } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/api";

export default function Pagamentos() {

  const [produtos, setProdutos] = useState([]);
  const [formas, setFormas] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);

  const [produtoId, setProdutoId] = useState("");
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

      const resFormas = await api.get("/formas-pagamento");
      setFormas(resFormas.data || []);

      const resPag = await api.get("/pagamentos");
      setPagamentos(resPag.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  /* =========================
     CALC VALOR
  ========================= */
  useEffect(() => {
    const produto = produtos.find(p => Number(p.id) === Number(produtoId));
    if (produto) {
      setValor(Number(produto.preco) * Number(quantidade));
    } else {
      setValor(0);
    }
  }, [produtoId, quantidade, produtos]);

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

    if (!produtoId || !formaPagamento) {
      return setMensagem("Dados incompletos");
    }

    if (loading) return;

    try {
      setLoading(true);

      await api.post("/pagamentos", {
        id_produto: produtoId,
        id_forma_pagamento: formaPagamento,
        parcelas
      });

      setMensagem("Criado com sucesso");

      setProdutoId("");
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

        {/* FORM */}
        <div className="card p-3 mb-3">

          <div className="row g-2">

            <div className="col-md-3">
              <select className="form-select"
                value={produtoId}
                onChange={(e) => setProdutoId(e.target.value)}
              >
                <option value="">Produto</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nome} - R$ {p.preco}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <input type="number"
                className="form-control"
                value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value))}
              />
            </div>

            <div className="col-md-2">
              <input className="form-control" value={valor.toFixed(2)} readOnly />
            </div>

            <div className="col-md-3">
              <select className="form-select"
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
              >
                <option value="">Forma</option>
                {formas.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <input type="number"
                className="form-control"
                value={qtdParcelas}
                onChange={(e) => setQtdParcelas(Number(e.target.value))}
              />
            </div>

          </div>

          <button
            className="btn btn-success mt-3"
            onClick={criarPagamento}
            disabled={loading}
          >
            {loading ? "Salvando..." : "Salvar"}
          </button>

        </div>

        {/* LISTA */}
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
                <td>{p.nome_produto}</td>
                <td>R$ {Number(p.valor).toFixed(2)}</td>
                <td className={getStatusClass(p.status)}>{p.status}</td>

                <td>
                  <button
                    className="btn btn-info btn-sm me-2"
                    onClick={() => abrirParcelas(p)}
                  >
                    Ver Parcelas
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

        {/* PAGINAÇÃO */}
        <div className="d-flex justify-content-between mt-3">
          <button className="btn btn-secondary"
            disabled={pagina === 1}
            onClick={() => setPagina(pagina - 1)}>
            Anterior
          </button>

          <span>Página {pagina}</span>

          <button className="btn btn-secondary"
            disabled={inicio + itensPorPagina >= pagamentos.length}
            onClick={() => setPagina(pagina + 1)}>
            Próxima
          </button>
        </div>

        {/* PARCELAS COMPLETAS */}
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
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {parcelasTabela.map(p => (
                  <tr key={p.id}>
                    <td>{p.numero_parcela}</td>
                    <td>R$ {Number(p.valor).toFixed(2)}</td>
                    <td>{new Date(p.data_vencimento).toLocaleDateString("pt-BR")}</td>
                    <td className={getStatusClass(p.status)}>{p.status}</td>

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

        {/* MODAL PAGAMENTO */}
        {editarPagamento && (
          <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog">
              <div className="modal-content">

                <div className="modal-header">
                  <h5>Editar Status</h5>
                  <button className="btn-close" onClick={() => setEditarPagamento(null)} />
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
                  <button className="btn btn-secondary" onClick={() => setEditarPagamento(null)}>Fechar</button>
                  <button className="btn btn-primary" onClick={salvarEdicao}>Salvar</button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* MODAL PARCELA */}
        {editarParcela && (
          <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog">
              <div className="modal-content">

                <div className="modal-header">
                  <h5>Editar Parcela</h5>
                  <button className="btn-close" onClick={() => setEditarParcela(null)} />
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
                  <button className="btn btn-secondary" onClick={() => setEditarParcela(null)}>Fechar</button>
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
