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
  const [valor, setValor] = useState("");

  const [qtdParcelas, setQtdParcelas] = useState(1);
  const [parcelas, setParcelas] = useState([]);
  const [parcelasSelecionadas, setParcelasSelecionadas] = useState([]);

  const [editarPagamento, setEditarPagamento] = useState(null);
  const [novoStatus, setNovoStatus] = useState("pendente");

  const [editarParcela, setEditarParcela] = useState(null);
  const [novoStatusParcela, setNovoStatusParcela] = useState("pendente");

  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);

  /* =========================
     CARREGAR DADOS
  ========================= */
  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    try {
      const [p, f, pag] = await Promise.all([
        api.get("/produtos"),
        api.get("/formas-pagamento"),
        api.get("/pagamentos"),
      ]);

      setProdutos(p.data || []);
      setFormas(f.data || []);
      setPagamentos(pag.data || []);

    } catch (err) {
      console.error(err);
      setMensagem("Erro ao carregar dados");
    }
  };

  /* =========================
     CALCULAR VALOR
  ========================= */
  useEffect(() => {
    const produto = produtos.find(p => Number(p.id) === Number(produtoId));
    if (produto) {
      setValor(Number(produto.preco) * quantidade);
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

    const base = Math.floor((valor / qtdParcelas) * 100) / 100;
    const resto = Number((valor - base * qtdParcelas).toFixed(2));

    const hoje = new Date();

    const lista = Array.from({ length: qtdParcelas }, (_, i) => {
      const venc = new Date(hoje);
      venc.setMonth(hoje.getMonth() + i + 1);

      return {
        numero: i + 1,
        valor: i === qtdParcelas - 1 ? base + resto : base,
        data_vencimento: venc.toISOString().split("T")[0],
        status: "pendente",
      };
    });

    setParcelas(lista);

  }, [qtdParcelas, valor]);

  /* =========================
     CRIAR
  ========================= */
  const criarPagamento = async () => {
    try {
      setLoading(true);

      await api.post("/pagamentos", {
        id_produto: produtoId,
        quantidade,
        id_forma_pagamento: formaPagamento,
        parcelas,
      });

      setMensagem("Criado com sucesso");
      carregar();

      setProdutoId("");
      setFormaPagamento("");
      setQuantidade(1);
      setValor("");
      setQtdParcelas(1);
      setParcelas([]);

    } catch (err) {
      console.error(err);
      setMensagem(err.response?.data?.erro || "Erro");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     EDITAR PAGAMENTO
  ========================= */
  const salvarEdicao = async () => {
    await api.put(`/pagamentos/${editarPagamento.id}`, {
      status: novoStatus,
    });

    setEditarPagamento(null);
    carregar();
  };

  /* =========================
     VER PARCELAS
  ========================= */
  const verParcelas = async (p) => {
    const res = await api.get(`/pagamentos/${p.id}/parcelas`);
    setParcelasSelecionadas(res.data);
  };

  /* =========================
     EDITAR PARCELA
  ========================= */
  const salvarParcela = async () => {
    await api.put(`/pagamentos/parcelas/${editarParcela.id}`, {
      status: novoStatusParcela,
    });

    setEditarParcela(null);
    verParcelas({ id: editarParcela.id_pagamento });
  };

  return (
    <DashboardLayout>

      <div className="container mt-4">

        <h3>Pagamentos</h3>

        {mensagem && <div className="alert alert-info">{mensagem}</div>}

        {/* FORM */}
        <div className="card p-3 mb-3">

          <div className="row g-2">

            <div className="col-md-3">
              <select className="form-select" value={produtoId}
                onChange={(e) => setProdutoId(e.target.value)}>
                <option value="">Produto</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nome} - R$ {p.preco}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <input type="number" className="form-control"
                value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value))}
              />
            </div>

            <div className="col-md-2">
              <input className="form-control" value={valor} readOnly />
            </div>

            <div className="col-md-3">
              <select className="form-select" value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}>
                <option value="">Forma</option>
                {formas.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <input type="number" className="form-control"
                value={qtdParcelas}
                onChange={(e) => setQtdParcelas(Number(e.target.value))}
              />
            </div>

          </div>

          <button className="btn btn-success mt-3" onClick={criarPagamento}>
            Salvar
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
            {pagamentos.map(p => (
              <tr key={p.id}>
                <td>{p.nome_produto}</td>
                <td>R$ {Number(p.valor).toFixed(2)}</td>
                <td>{p.status}</td>

                <td>
                  <button className="btn btn-info btn-sm me-2"
                    onClick={() => verParcelas(p)}>
                    Parcelas
                  </button>

                  <button className="btn btn-primary btn-sm"
                    onClick={() => {
                      setEditarPagamento(p);
                      setNovoStatus(p.status);
                    }}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* MODAL */}
        {editarPagamento && (
          <div className="modal show d-block" style={{ background: "#00000080" }}>
            <div className="modal-dialog">
              <div className="modal-content">

                <div className="modal-body">
                  <select className="form-select"
                    value={novoStatus}
                    onChange={(e) => setNovoStatus(e.target.value)}>
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

                  <button className="btn btn-primary" onClick={salvarEdicao}>
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
