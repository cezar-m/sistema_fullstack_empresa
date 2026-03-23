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

        {/* FORM */}
        <div className="card p-3 mb-3">

          <div className="row g-2">

            {/* 🔥 NOVO SELECT VENDA */}
            <div className="col-md-3">
              <select className="form-select"
                value={vendaId}
                onChange={(e) => setVendaId(e.target.value)}
              >
                <option value="">Venda</option>
                {vendas.map(v => (
                  <option key={v.id} value={v.id}>
                    Venda #{v.id} - R$ {Number(v.total).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            {/* 🔥 MANTIDO PRODUTO MAS NÃO USA MAIS */}
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

          <div className="text-center mt-3">
            <button className="btn btn-success px-4"
              onClick={criarPagamento}
              disabled={loading}
            >
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>

        </div>

        {/* RESTO DO SEU CÓDIGO CONTINUA IGUAL (tabela, modais, etc) */}

      </div>
    </DashboardLayout>
  );
}
