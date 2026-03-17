import { useState, useEffect } from "react";
import api from "../api/api";
import DashboardLayout from "../layouts/DashboardLayout";

/* =========================
   INTERCEPTOR (TOKEN)
========================= */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (!config.headers) config.headers = {};

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default function Pagamentos() {
  const [produtos, setProdutos] = useState([]);
  const [formas, setFormas] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);

  const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [valor, setValor] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [qtdParcelas, setQtdParcelas] = useState(1);
  const [parcelas, setParcelas] = useState([]);

  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);

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
     LISTAR DADOS
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

        setProdutos(Array.isArray(prodRes.data) ? prodRes.data : []);
        setFormas(Array.isArray(formaRes.data) ? formaRes.data : []);
        setPagamentos(Array.isArray(pagRes.data) ? pagRes.data : []);

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
    if (!produtoId) {
      setValor("");
      return;
    }

    const produto = produtos.find(p => Number(p.id) === Number(produtoId));

    if (produto) {
      const total = Number(produto.preco || 0) * quantidade;
      setValor(total);
    }
  }, [produtoId, quantidade, produtos]);

  /* =========================
     GERAR PARCELAS
  ========================= */
  useEffect(() => {
    const valorNumero = Number(valor);

    if (!valorNumero || qtdParcelas <= 1) {
      setParcelas([]);
      return;
    }

    const valorBase = Math.floor((valorNumero / qtdParcelas) * 100) / 100;
    const resto = Number((valorNumero - valorBase * qtdParcelas).toFixed(2));

    const hoje = new Date();

    const novas = Array.from({ length: qtdParcelas }, (_, i) => {
      const venc = new Date(hoje);
      venc.setMonth(hoje.getMonth() + i + 1);

      return {
        numero: i + 1,
        valor: i === qtdParcelas - 1 ? valorBase + resto : valorBase,
        data_vencimento: venc.toISOString().split("T")[0],
        status: "pendente",
      };
    });

    setParcelas(novas);
  }, [valor, qtdParcelas]);

  /* =========================
     CRIAR PAGAMENTO (CORRIGIDO)
  ========================= */
  const criarPagamento = async () => {
    if (!produtoId || !formaPagamento || !valor) {
      setMensagem("Preencha todos os campos");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        id_produto: Number(produtoId),
        valor: Number(valor),
        quantidade: Number(quantidade),
        forma_pagamento: formaPagamento,
        parcelas: parcelas.length > 0 ? parcelas : [],
      };

      const res = await api.post("/pagamentos", payload);

      setMensagem(res.data?.msg || "Pagamento criado com sucesso");

      // Atualiza lista
      setPagamentos(prev => [
        {
          id: res.data?.id_pagamento || Date.now(),
          nome_produto:
            produtos.find(p => p.id == produtoId)?.nome || "",
          forma_pagamento: formaPagamento,
          valor,
          status: "pago",
          data_pagamento: new Date().toISOString(),
        },
        ...prev,
      ]);

      // Reset
      setProdutoId("");
      setValor("");
      setFormaPagamento("");
      setQtdParcelas(1);
      setParcelas([]);
      setQuantidade(1);
      setPagina(1);

    } catch (err) {
      console.error(err);
      console.log(err.response?.data);

      setMensagem(
        err.response?.data?.erro || "Erro ao criar pagamento"
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     PAGINAÇÃO
  ========================= */
  const totalPaginas = Math.max(
    1,
    Math.ceil(pagamentos.length / registrosPorPagina)
  );

  const pagamentosPagina = pagamentos.slice(
    (pagina - 1) * registrosPorPagina,
    pagina * registrosPorPagina
  );

  /* =========================
     RENDER
  ========================= */
  return (
    <DashboardLayout>
      <div className="container mt-4">

        <h3>Pagamentos</h3>

        {mensagem && <div className="alert alert-info">{mensagem}</div>}
        {loading && <div className="alert alert-warning">Carregando...</div>}

        {/* FORM */}
        <div className="card mb-3 shadow">
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
                  onChange={(e) => setValor(e.target.value)}
                />
              </div>

              <div className="col-md-3">
                <label>Forma</label>
                <select
                  className="form-select"
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {formas.map(f => (
                    <option key={f.id} value={f.nome}>
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
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </DashboardLayout>
  );
}
