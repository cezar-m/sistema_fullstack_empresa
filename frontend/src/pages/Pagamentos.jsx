import { useState, useEffect } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/api";

export default function Pagamentos() {

  const [produtos, setProdutos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [formas, setFormas] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);

  const [produtoId, setProdutoId] = useState("");
  const [vendaId, setVendaId] = useState("");
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
      const timer = setTimeout(() => setMensagem(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [mensagem]);

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    try {
      const resProdutos = await api.get("/products/listar");
      setProdutos(resProdutos.data || []);

      const resVendas = await api.get("/vendas");
      setVendas(resVendas.data || []);

      const resFormas = await api.get("/formas-pagamento");
      setFormas(resFormas.data || []);

      const resPag = await api.get("/pagamentos");
      setPagamentos(resPag.data || []);

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const venda = vendas.find(v => Number(v.id) === Number(vendaId));
    setValor(venda ? Number(venda.total) : 0);
  }, [vendaId, vendas]);

  useEffect(() => {
    if (!valor || qtdParcelas <= 1) {
      setParcelas([]);
      return;
    }

    const lista = [];
    let soma = 0;

    for (let i = 0; i < qtdParcelas; i++) {
      let valorParcela = Number((valor / qtdParcelas).toFixed(2));

      if (i === qtdParcelas - 1) {
        valorParcela = Number((valor - soma).toFixed(2));
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

  const criarPagamento = async () => {

    if (!vendaId || !formaPagamento) {
      return setMensagem("Selecione venda e forma de pagamento");
    }

    if (loading) return;

    try {
      setLoading(true);

      const payload = {
        id_venda: Number(vendaId),
        id_forma_pagamento: Number(formaPagamento),
        parcelas
      };

      console.log("ENVIANDO:", payload);

      await api.post("/pagamentos", payload);

      setMensagem("Criado com sucesso");

      setProdutoId("");
      setVendaId("");
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

  const abrirParcelas = async (p) => {
    try {
      const res = await api.get(`/pagamentos/${p.id}/parcelas`);
      setParcelasTabela(res.data || []);
    } catch (err) {
      console.error(err);
      setMensagem("Erro ao carregar parcelas");
    }
  };

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

  const getStatusClass = (status) => {
    if (status === "pendente") return "text-danger fw-bold";
    if (status === "pago") return "text-success fw-bold";
    if (status === "cancelado") return "text-secondary fw-bold";
    return "";
  };

  const inicio = (pagina - 1) * itensPorPagina;
  const listaPaginada = pagamentos.slice(inicio, inicio + itensPorPagina);

  return (
    <DashboardLayout>

      <div className="container mt-4">

        <h3>Pagamentos</h3>

        {mensagem && (
          <div className="alert alert-info">{mensagem}</div>
        )}

        <div className="card p-3 mb-3">
          <div className="row g-2">

            <div className="col-md-4">
              <select
                className="form-select"
                value={vendaId}
                onChange={(e) => setVendaId(e.target.value)}
              >
                <option value="">Selecione a venda</option>
                {vendas.map(v => (
                  <option key={v.id} value={v.id}>
                    #{v.id} - R$ {Number(v.total).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <select
                className="form-select"
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
              >
                <option value="">Selecione a forma</option>
                {formas.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <input
                className="form-control"
                value={`R$ ${Number(valor).toFixed(2)}`}
                readOnly
              />
            </div>

            <div className="col-md-2">
              <input
                type="number"
                className="form-control"
                value={qtdParcelas}
                min="1"
                onChange={(e) => setQtdParcelas(Number(e.target.value))}
              />
            </div>

          </div>

          <div className="text-center mt-3">
            <button
              className="btn btn-success"
              onClick={criarPagamento}
              disabled={loading}
            >
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>

        </div>

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

        {parcelasTabela.length > 0 && (
          <div className="card mt-4 p-3">
            <h5>Parcelas</h5>

            <table className="table table-bordered">
              <tbody>
                {parcelasTabela.map(p => (
                  <tr key={p.id}>
                    <td>{p.numero_parcela}</td>
                    <td>R$ {Number(p.valor).toFixed(2)}</td>
                    <td>{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </DashboardLayout>
  );
}
