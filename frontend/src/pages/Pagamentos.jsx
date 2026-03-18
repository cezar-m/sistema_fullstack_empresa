import { useState, useEffect } from "react";
import api from "../api/api";
import DashboardLayout from "../layouts/DashboardLayout";

export default function Pagamentos() {

  const [produtos, setProdutos] = useState([]);
  const [formas, setFormas] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);

  const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [valor, setValor] = useState(0);
  const [formaPagamentoId, setFormaPagamentoId] = useState("");

  const [parcelas, setParcelas] = useState([]);
  const [parcelasSelecionadas, setParcelasSelecionadas] = useState([]);

  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);

  const [editarPagamento, setEditarPagamento] = useState(null);
  const [novoStatus, setNovoStatus] = useState("pago");

  const [editarParcela, setEditarParcela] = useState(null);
  const [novoStatusParcela, setNovoStatusParcela] = useState("pendente");

  /* =========================
     CARREGAR DADOS
  ========================= */
  useEffect(() => {
    const carregar = async () => {
      try {
        setLoading(true);

        const [p1, p2, p3] = await Promise.all([
          api.get("/products/listar"),
          api.get("/formas-pagamento"),
          api.get("/pagamentos")
        ]);

        setProdutos(p1.data || []);
        setFormas(p2.data || []);
        setPagamentos(p3.data || []);

      } catch (err) {
        console.error(err);
        setMensagem("Erro ao carregar");
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, []);

  /* =========================
     CALCULAR VALOR
  ========================= */
  useEffect(() => {
    const produto = produtos.find(p => p.id == produtoId);

    if (produto) {
      setValor(Number(produto.preco) * Number(quantidade));
    } else {
      setValor(0);
    }
  }, [produtoId, quantidade, produtos]);

  /* =========================
     CRIAR PAGAMENTO
  ========================= */
  const criarPagamento = async () => {
    try {
      if (!produtoId || !formaPagamentoId) {
        setMensagem("Preencha os campos");
        return;
      }

      const payload = {
        id_produto: Number(produtoId),
        quantidade: Number(quantidade),
        id_forma_pagamento: Number(formaPagamentoId),
        parcelas: parcelas
      };

      console.log("ENVIANDO:", payload);

      await api.post("/pagamentos", payload);

      setMensagem("Pagamento criado");

      // recarrega lista
      const res = await api.get("/pagamentos");
      setPagamentos(res.data);

      // reset
      setProdutoId("");
      setQuantidade(1);
      setValor(0);
      setFormaPagamentoId("");
      setParcelas([]);

    } catch (err) {
      console.error(err);
      setMensagem(err.response?.data?.erro || "Erro");
    }
  };

  /* =========================
     VER PARCELAS
  ========================= */
  const verParcelas = async (p) => {
    try {
      const res = await api.get(`/pagamentos/${p.id}/parcelas`);
      setParcelasSelecionadas(res.data || []);
    } catch (err) {
      console.error(err);
      setParcelasSelecionadas([]);
    }
  };

  /* =========================
     EDITAR PAGAMENTO
  ========================= */
  const salvarEdicao = async () => {
    try {
      await api.put(`/pagamentos/pago/${editarPagamento.id}`, {
        status: novoStatus
      });

      setPagamentos(prev =>
        prev.map(p =>
          p.id === editarPagamento.id
            ? { ...p, status: novoStatus }
            : p
        )
      );

      setEditarPagamento(null);
      setMensagem("Atualizado");
    } catch (err) {
      console.error(err);
      setMensagem("Erro ao editar");
    }
  };

  /* =========================
     EDITAR PARCELA
  ========================= */
  const salvarParcela = async () => {
    try {
      await api.put(`/pagamentos/parcelas/${editarParcela.id}`, {
        status: novoStatusParcela
      });

      setParcelasSelecionadas(prev =>
        prev.map(p =>
          p.id === editarParcela.id
            ? { ...p, status: novoStatusParcela }
            : p
        )
      );

      setEditarParcela(null);
      setMensagem("Parcela atualizada");
    } catch (err) {
      console.error(err);
      setMensagem("Erro parcela");
    }
  };

  return (
    <DashboardLayout>
      <div className="container mt-4">

        <h3>Pagamentos</h3>

        {mensagem && <div className="alert alert-info">{mensagem}</div>}
        {loading && <div className="alert alert-warning">Carregando...</div>}

        {/* FORM */}
        <div className="card mb-3">
          <div className="card-body">
            <div className="row g-2">

              <div className="col-md-3">
                <select
                  className="form-select"
                  value={produtoId}
                  onChange={(e) => setProdutoId(Number(e.target.value))}
                >
                  <option value="">Produto</option>
                  {produtos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-2">
                <input
                  type="number"
                  className="form-control"
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                />
              </div>

              <div className="col-md-2">
                <input
                  type="number"
                  className="form-control"
                  value={valor}
                  readOnly
                />
              </div>

              <div className="col-md-3">
                <select
                  className="form-select"
                  value={formaPagamentoId}
                  onChange={(e) => setFormaPagamentoId(Number(e.target.value))}
                >
                  <option value="">Forma</option>
                  {formas.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-2">
                <button
                  className="btn btn-success w-100"
                  onClick={criarPagamento}
                >
                  Salvar
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* TABELA */}
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Forma</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {pagamentos.map(p => (
              <tr key={p.id}>
                <td>{p.nome_produto}</td>
                <td>{p.forma_pagamento}</td>
                <td>R$ {Number(p.valor).toFixed(2)}</td>
                <td>{p.status}</td>
                <td>

                  {/* VER PARCELAS */}
                  <button
                    className="btn btn-info btn-sm me-2"
                    onClick={() => verParcelas(p)}
                  >
                    Parcelas
                  </button>

                  {/* EDITAR PAGAMENTO */}
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setEditarPagamento(p)}
                  >
                    Editar
                  </button>

                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* EDITAR PAGAMENTO */}
        {editarPagamento && (
          <div className="card p-3 mt-3">
            <h5>Editar Pagamento</h5>

            <select
              className="form-select mb-2"
              value={novoStatus}
              onChange={(e) => setNovoStatus(e.target.value)}
            >
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
            </select>

            <button className="btn btn-success" onClick={salvarEdicao}>
              Salvar
            </button>
          </div>
        )}

        {/* LISTAR PARCELAS */}
        {parcelasSelecionadas.length > 0 && (
          <div className="card mt-3 p-3">
            <h5>Parcelas</h5>

            {parcelasSelecionadas.map(p => (
              <div key={p.id} className="d-flex justify-content-between mb-2">

                <span>
                  {p.numero_parcela} - R$ {p.valor} - {p.status}
                </span>

                <button
                  className="btn btn-warning btn-sm"
                  onClick={() => setEditarParcela(p)}
                >
                  Editar
                </button>

              </div>
            ))}
          </div>
        )}

        {/* EDITAR PARCELA */}
        {editarParcela && (
          <div className="card p-3 mt-3">
            <h5>Editar Parcela</h5>

            <select
              className="form-select mb-2"
              value={novoStatusParcela}
              onChange={(e) => setNovoStatusParcela(e.target.value)}
            >
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
            </select>

            <button className="btn btn-success" onClick={salvarParcela}>
              Salvar
            </button>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
