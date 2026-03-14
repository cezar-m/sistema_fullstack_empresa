import { useState, useEffect } from "react";
import api from "../api/api";
import DashboardLayout from "../layouts/DashboardLayout";

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (!config.headers) {
    config.headers = {};
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default function Pagamentos() {
  const [produtos, setProdutos] = useState([]);
  const [formas, setFormas] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [quantidade, setQuantidade] = useState(1);
  const [parcelasSelecionadas, setParcelasSelecionadas] = useState([]);

  const [produtoId, setProdutoId] = useState("");
  const [valor, setValor] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [qtdParcelas, setQtdParcelas] = useState(1);
  const [parcelas, setParcelas] = useState([]);
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);

  const [editarPagamento, setEditarPagamento] = useState(null);
  const [novoStatus, setNovoStatus] = useState("pendente");

  const [editarParcela, setEditarParcela] = useState(null);
  const [novoStatusParcela, setNovoStatusParcela] = useState("pendente");

  const [pagina, setPagina] = useState(1);
  const registrosPorPagina = 10;

  useEffect(() => {
    if (!mensagem) return;

    const timer = setTimeout(() => {
      setMensagem("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [mensagem]);

  const totalPaginas = Math.max(
    1,
    Math.ceil((Array.isArray(pagamentos) ? pagamentos.length : 0) / registrosPorPagina)
  );

  const pagamentosPagina = (Array.isArray(pagamentos) ? pagamentos : []).slice(
    (pagina - 1) * registrosPorPagina,
    pagina * registrosPorPagina
  );

  const irParaPagina = (num) => {
    if (num < 1) num = 1;
    if (num > totalPaginas) num = totalPaginas;
    setPagina(num);
  };

  useEffect(() => {
    const listarProdutos = async () => {
      try {
        setLoading(true);
        const res = await api.get("/products/listar");
        setProdutos(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
        setMensagem("Erro ao carregar produtos");
      } finally {
        setLoading(false);
      }
    };

    const listarFormas = async () => {
      try {
        const res = await api.get("/formas-pagamento");
        setFormas(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
        setMensagem("Erro ao carregar formas de pagamento");
      }
    };

    const listarPagamentos = async () => {
      try {
        const res = await api.get("/pagamentos");
        setPagamentos(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
      }
    };

    listarProdutos();
    listarFormas();
    listarPagamentos();
  }, []);

  useEffect(() => {
    if (!produtoId) {
      setValor("");
      return;
    }

    const produto = produtos.find((p) => Number(p.id) === Number(produtoId));

    if (produto) {
      const preco = Number(produto.preco || 0);
      const total = preco * quantidade;
      setValor(total);
    }
  }, [produtoId, quantidade, produtos]);

  useEffect(() => {
    const valorNumero = Number(valor);

    if (!valorNumero || qtdParcelas <= 1) {
      setParcelas([]);
      return;
    }

    const valorBase = Math.floor((valorNumero / qtdParcelas) * 100) / 100;
    const resto = Number((valorNumero - valorBase * qtdParcelas).toFixed(2));

    const hoje = new Date();

    const novasParcelas = Array.from({ length: qtdParcelas }, (_, i) => {
      const venc = new Date(hoje);
      venc.setMonth(hoje.getMonth() + i + 1);

      return {
        numero: i + 1,
        valor: i === qtdParcelas - 1 ? Number((valorBase + resto).toFixed(2)) : valorBase,
        data_vencimento: venc.toISOString().split("T")[0],
        status: "pendente",
      };
    });

    setParcelas(novasParcelas);
  }, [qtdParcelas, valor]);

  const criarPagamento = async () => {
    if (!produtoId || !formaPagamento || !valor) {
      setMensagem("Preencha todos os campos");
      return;
    }

    const produto = produtos.find((p) => Number(p.id) === Number(produtoId));

    if (!produto) {
      setMensagem("Produto inválido");
      return;
    }

    const payload = {
      nome_produto: produto.nome,
      forma_pagamento: formaPagamento,
      parcelas,
    };

    try {
      setLoading(true);

      const res = await api.post("/pagamentos", payload);

      setMensagem(res.data?.msg || "Pagamento criado com sucesso!");

      setPagamentos((prev) => [
        {
          id: res.data?.id_pagamento || Date.now(),
          nome_produto: produto.nome,
          forma_pagamento: formaPagamento,
          valor: Number(valor),
          status: "pago",
          data_pagamento: new Date().toISOString(),
          parcelas,
        },
        ...prev,
      ]);

      setPagina(1);
      setProdutoId("");
      setValor("");
      setFormaPagamento("");
      setQtdParcelas(1);
      setParcelas([]);
    } catch (err) {
      console.error(err);
      setMensagem("Erro ao criar pagamento");
    } finally {
      setLoading(false);
    }
  };

  const abrirEdicao = (pagamento) => {
    setEditarPagamento(pagamento);
    setNovoStatus(pagamento.status);
  };

  const salvarEdicao = async () => {
    if (!editarPagamento) return;

    try {
      await api.put(`/pagamentos/pago/${editarPagamento.id}`, {
        status: novoStatus,
      });

      setPagamentos((prev) =>
        prev.map((p) =>
          p.id === editarPagamento.id ? { ...p, status: novoStatus } : p
        )
      );

      setEditarPagamento(null);
      setMensagem("Pagamento atualizado com sucesso");
    } catch (err) {
      console.error(err);
      setMensagem("Erro ao atualizar pagamento");
    }
  };

  const verParcelas = async (pagamento) => {
    if (!pagamento?.id) {
      setParcelasSelecionadas([]);
      return;
    }

    try {
      const res = await api.get(`/pagamentos/${pagamento.id}/parcelas`);
      setParcelasSelecionadas(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setParcelasSelecionadas([]);
    }
  };

  const salvarParcela = async () => {
    if (!editarParcela) return;

    try {
      await api.put(`/pagamentos/parcelas/${editarParcela.id}`, {
        status: novoStatusParcela,
      });

      setParcelasSelecionadas((prev) =>
        prev.map((p) =>
          p.id === editarParcela.id
            ? { ...p, status: novoStatusParcela }
            : p
        )
      );

      setEditarParcela(null);
      setMensagem("Parcela atualizada com sucesso!");
    } catch (err) {
      console.error(err);
      setMensagem("Erro ao atualizar parcela");
    }
  };

  return (
    <DashboardLayout>
      <div className="container mt-4">
        <h3>Pagamentos</h3>

        {mensagem && <div className="alert alert-info">{mensagem}</div>}
        {loading && <div className="alert alert-warning">Carregando...</div>}

        {/* FORMULÁRIO */}

        <div className="card shadow mb-3">
          <div className="card-body">
            <div className="row g-3">

              <div className="col-md-3">
                <label className="form-label">Produto</label>
                <select
                  className="form-select"
                  value={produtoId}
                  onChange={(e) => setProdutoId(e.target.value)}
                >
                  <option value="">Selecione</option>

                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} - R$ {p.preco}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-2">
                <label>Quantidade</label>
                <input
                  type="number"
                  min="1"
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
                <label>Forma pagamento</label>
                <select
                  className="form-select"
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                >
                  <option value="">Selecione</option>

                  {formas.map((f) => (
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
                  min="1"
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

        {/* TABELA PAGAMENTOS */}

        <table className="table table-striped table-bordered">
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
            {pagamentosPagina.map((p) => (
              <tr key={p.id}>
                <td>{p.nome_produto}</td>
                <td>{p.forma_pagamento}</td>
                <td>R$ {Number(p.valor || 0).toFixed(2)}</td>
                <td>{p.status}</td>
                <td>
                  {p.data_pagamento
                    ? new Date(p.data_pagamento).toLocaleDateString()
                    : "-"}
                </td>

                <td>
                  <button
                    className="btn btn-info btn-sm me-2"
                    onClick={() => verParcelas(p)}
                  >
                    Parcelas
                  </button>

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => abrirEdicao(p)}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* PAGINAÇÃO */}

        <div className="d-flex justify-content-between align-items-center">
          <button
            className="btn btn-secondary"
            onClick={() => irParaPagina(pagina - 1)}
            disabled={pagina === 1}
          >
            Anterior
          </button>

          <span>
            Página {pagina} de {totalPaginas}
          </span>

          <button
            className="btn btn-secondary"
            onClick={() => irParaPagina(pagina + 1)}
            disabled={pagina === totalPaginas}
          >
            Próximo
          </button>
        </div>

      </div>
    </DashboardLayout>
  );
}
