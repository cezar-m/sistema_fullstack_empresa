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

  const [qtdParcelas, setQtdParcelas] = useState(1);
  const [parcelas, setParcelas] = useState([]);
  const [parcelasSelecionadas, setParcelasSelecionadas] = useState([]);

  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);

  const [editarPagamento, setEditarPagamento] = useState(null);
  const [novoStatus, setNovoStatus] = useState("pendente");

  const [editarParcela, setEditarParcela] = useState(null);
  const [novoStatusParcela, setNovoStatusParcela] = useState("pendente");

  const [pagina, setPagina] = useState(1);
  const registrosPorPagina = 10;

  /* =========================
     ALERT AUTO SUMIR
  ========================= */
  useEffect(() => {
    if (!mensagem) return;
    const timer = setTimeout(() => setMensagem(""), 3000);
    return () => clearTimeout(timer);
  }, [mensagem]);

  /* =========================
     CARREGAR DADOS
  ========================= */
  useEffect(() => {
    const carregar = async () => {
      try {
        setLoading(true);

        const [prodRes, formaRes, pagRes] = await Promise.all([
          api.get("/products/listar"),
          api.get("/formas-pagamento"),
          api.get("/pagamentos"),
        ]);

        setProdutos(prodRes.data || []);
        setFormas(formaRes.data || []);
        setPagamentos(pagRes.data || []);

      } catch (err) {
        console.error(err);
        setMensagem("Erro ao carregar dados");
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
    const produto = produtos.find(p => Number(p.id) === Number(produtoId));

    if (produto && quantidade > 0) {
      const total = Number(produto.preco) * Number(quantidade);
      setValor(Number(total.toFixed(2)));
    } else {
      setValor(0);
    }
  }, [produtoId, quantidade, produtos]);

  /* =========================
     GERAR PARCELAS
  ========================= */
  useEffect(() => {
    if (qtdParcelas <= 1 || valor <= 0) {
      setParcelas([]);
      return;
    }

    const total = Number(valor);
    const base = Math.floor((total / qtdParcelas) * 100) / 100;
    const resto = Number((total - base * qtdParcelas).toFixed(2));

    const hoje = new Date();
    const novas = [];

    for (let i = 0; i < qtdParcelas; i++) {
      const venc = new Date(hoje);
      venc.setMonth(hoje.getMonth() + i + 1);

      novas.push({
        numero: i + 1,
        valor: i === qtdParcelas - 1 ? base + resto : base,
        data_vencimento: venc.toISOString().split("T")[0],
        status: "pendente"
      });
    }

    setParcelas(novas);
  }, [valor, qtdParcelas]);

  /* =========================
     CRIAR PAGAMENTO
  ========================= */
  const criarPagamento = async () => {
    if (!produtoId || !formaPagamentoId) {
      setMensagem("Preencha todos os campos");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        id_produto: Number(produtoId),
        quantidade: Number(quantidade),
        valor: Number(valor),
        id_forma_pagamento: Number(formaPagamentoId),
        parcelas: parcelas
      };

      console.log("PAYLOAD:", payload);

      const res = await api.post("/pagamentos", payload);

      setMensagem("Pagamento criado com sucesso");

      setPagamentos(prev => [
        {
          id: res.data.id_pagamento,
          nome_produto: produtos.find(p => p.id == produtoId)?.nome,
          forma_pagamento: formas.find(f => f.id == formaPagamentoId)?.nome,
          valor,
          status: "pago",
          data_pagamento: new Date().toISOString()
        },
        ...prev
      ]);

      // RESET
      setProdutoId("");
      setQuantidade(1);
      setValor(0);
      setFormaPagamentoId("");
      setQtdParcelas(1);
      setParcelas([]);
      setPagina(1);

    } catch (err) {
      console.error(err);
      setMensagem(err.response?.data?.erro || "Erro ao criar pagamento");
    } finally {
      setLoading(false);
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
     ATUALIZAR PAGAMENTO
  ========================= */
  const salvarEdicao = async () => {
    try {
      await api.put(`/pagamentos/pago/${editarPagamento.id}`, {
        status: novoStatus
      });

      setPagamentos(prev =>
        prev.map(p =>
          p.id === editarPagamento.id ? { ...p, status: novoStatus } : p
        )
      );

      setEditarPagamento(null);
      setMensagem("Pagamento atualizado");
    } catch (err) {
      console.error(err);
      setMensagem("Erro ao atualizar pagamento");
    }
  };

  /* =========================
     ATUALIZAR PARCELA
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
      setMensagem("Erro ao atualizar parcela");
    }
  };

  /* =========================
     PAGINAÇÃO
  ========================= */
  const totalPaginas = Math.max(1, Math.ceil(pagamentos.length / registrosPorPagina));

  const pagamentosPagina = pagamentos.slice(
    (pagina - 1) * registrosPorPagina,
    pagina * registrosPorPagina
  );

  return (
    <DashboardLayout>
      <div className="container mt-4">

        <h3>Pagamentos</h3>

        {mensagem && <div className="alert alert-info">{mensagem}</div>}
        {loading && <div className="alert alert-warning">Carregando...</div>}

        {/* FORM */}
        <div className="card shadow mb-3">
          <div className="card-body">
            <div className="row g-3">

              <div className="col-md-3">
                <label>Produto</label>
                <select
                  className="form-select"
                  value={produtoId}
                  onChange={(e) => setProdutoId(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {produtos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome} - R$ {p.preco}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-2">
                <label>Qtd</label>
                <input
                  type="number"
                  className="form-control"
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                />
              </div>

              <div className="col-md-2">
                <label>Valor</label>
                <input
                  type="number"
                  className="form-control"
                  value={valor}
                  readOnly
                />
              </div>

              <div className="col-md-3">
                <label>Forma</label>
                <select
                  className="form-select"
                  value={formaPagamentoId}
                  onChange={(e) => setFormaPagamentoId(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {formas.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-2">
                <label>Parcelas</label>
                <input
                  type="number"
                  className="form-control"
                  value={qtdParcelas}
                  onChange={(e) => setQtdParcelas(Number(e.target.value))}
                />
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
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {pagamentosPagina.map(p => (
              <tr key={p.id}>
                <td>{p.nome_produto}</td>
                <td>{p.forma_pagamento}</td>
                <td>R$ {Number(p.valor).toFixed(2)}</td>
                <td>{p.status}</td>
                <td>
                  {p.data_pagamento
                    ? new Date(p.data_pagamento).toLocaleDateString()
                    : "-"}
                </td>
                <td>
                  <button className="btn btn-info btn-sm me-2" onClick={() => verParcelas(p)}>
                    Parcelas
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => setEditarPagamento(p)}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </DashboardLayout>
  );
}
