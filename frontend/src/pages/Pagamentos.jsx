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

  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    try {
      const resProdutos = await api.get("/products/listar");
      setProdutos(resProdutos.data || []);
    } catch (err) {
      console.error("ERRO PRODUTOS:", err);
    }

    try {
      const resFormas = await api.get("/formas-pagamento");
      setFormas(resFormas.data || []);
    } catch (err) {
      console.error("ERRO FORMAS:", err);
    }

    try {
      const resPag = await api.get("/pagamentos");
      setPagamentos(resPag.data || []);
    } catch (err) {
      console.error("ERRO PAGAMENTOS:", err);
    }
  };

  useEffect(() => {
    const produto = produtos.find(p => Number(p.id) === Number(produtoId));
    if (produto) {
      setValor(Number(produto.preco) * quantidade);
    } else {
      setValor(0);
    }
  }, [produtoId, quantidade, produtos]);

  useEffect(() => {
    if (!valor || qtdParcelas <= 1) {
      setParcelas([]);
      return;
    }

    const base = Number((valor / qtdParcelas).toFixed(2));
    const hoje = new Date();

    const lista = [];

    for (let i = 0; i < qtdParcelas; i++) {
      const venc = new Date();
      venc.setMonth(hoje.getMonth() + i + 1);

      lista.push({
        numero: i + 1,
        valor: base,
        data_vencimento: venc.toISOString().split("T")[0],
        status: "pendente"
      });
    }

    setParcelas(lista);
  }, [qtdParcelas, valor]);

  const criarPagamento = async () => {
    if (!produtoId || !formaPagamento) {
      return setMensagem("Dados incompletos");
    }

    try {
      setLoading(true);

      const produto = produtos.find(p => Number(p.id) === Number(produtoId));
      const forma = formas.find(f => Number(f.id) === Number(formaPagamento));

      await api.post("/pagamentos", {
        nome_produto: produto?.nome,
        forma_pagamento: forma?.nome,
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
      console.error(err);
      setMensagem(err.response?.data?.erro || "Erro");
    } finally {
      setLoading(false);
    }
  };

  const salvarEdicao = async () => {
    try {
      await api.put(`/pagamentos/pago/${editarPagamento.id`, {
        status: novoStatus,
      });

      setEditarPagamento(null);
      carregar();

    } catch (err) {
      console.error(err);
      setMensagem("Erro ao editar");
    }
  };

  return (
    <DashboardLayout>

      <div className="container mt-4">
        <h3>Pagamentos</h3>

        {mensagem && <div className="alert alert-info">{mensagem}</div>}

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
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <input className="form-control" value={valor} readOnly />
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

          {parcelas.length > 0 && (
            <div className="mt-3">
              <strong>Parcelas:</strong>
              {parcelas.map(p => (
                <div key={p.numero}>
                  {p.numero} - R$ {p.valor} - {p.data_vencimento}
                </div>
              ))}
            </div>
          )}

          <button className="btn btn-success mt-3" onClick={criarPagamento}>
            Salvar
          </button>
        </div>

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
                  <button
                    className="btn btn-warning btn-sm"
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

        {editarPagamento && (
          <div className="modal fade show d-block">
            <div className="modal-dialog">
              <div className="modal-content">

                <div className="modal-header">
                  <h5>Editar Status</h5>
                  <button className="btn-close"
                    onClick={() => setEditarPagamento(null)}
                  />
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
                    onClick={() => setEditarPagamento(null)}
                  >
                    Fechar
                  </button>

                  <button className="btn btn-primary"
                    onClick={salvarEdicao}
                  >
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
