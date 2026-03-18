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

  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);

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
    const produto = produtos.find(p => p.id == produtoId);

    if (produto) {
      setValor(Number(produto.preco) * Number(quantidade));
    } else {
      setValor(0);
    }
  }, [produtoId, quantidade, produtos]);

  /* =========================
     GERAR PARCELAS (CORRIGIDO)
  ========================= */
  useEffect(() => {
    if (qtdParcelas <= 1 || valor <= 0) {
      setParcelas([]);
      return;
    }

    const valorBase = Number((valor / qtdParcelas).toFixed(2));
    const hoje = new Date();

    const novas = [];

    for (let i = 0; i < qtdParcelas; i++) {
      const venc = new Date(hoje);
      venc.setMonth(hoje.getMonth() + i + 1);

      novas.push({
        numero: i + 1,
        valor: valorBase,
        data_vencimento: venc.toISOString().split("T")[0],
        status: "pendente"
      });
    }

    setParcelas(novas);
  }, [valor, qtdParcelas]);

  /* =========================
     CRIAR PAGAMENTO (CORRIGIDO)
  ========================= */
  const criarPagamento = async () => {
    if (!produtoId || !formaPagamentoId) {
      setMensagem("Preencha tudo");
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

      console.log("ENVIANDO:", payload);

      const res = await api.post("/pagamentos", payload);

      setMensagem("Pagamento criado com sucesso");

      // atualizar lista
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

      // RESET LIMPO
      setProdutoId("");
      setFormaPagamentoId("");
      setQtdParcelas(1);
      setParcelas([]);
      setQuantidade(1);
      setValor(0);

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

  return (
    <DashboardLayout>
      <div className="container mt-4">

        <h3>Pagamentos</h3>

        {mensagem && <div className="alert alert-info">{mensagem}</div>}
        {loading && <div className="alert alert-warning">Carregando...</div>}

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
                  onChange={(e) => setQuantidade(e.target.value)}
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
