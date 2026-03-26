import { useState, useEffect } from "react";
import api from "../api/api";
import DashboardLayout from "../layouts/DashboardLayout";

export default function Pagamentos() {
  const [produtos, setProdutos] = useState([]);
  const [formas, setFormas] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [vendas, setVendas] = useState([]);

  const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [formaPagamento, setFormaPagamento] = useState("");
  const [valor, setValor] = useState(0);
  const [qtdParcelas, setQtdParcelas] = useState(1);
  const [parcelas, setParcelas] = useState([]);
  const [parcelasSelecionadas, setParcelasSelecionadas] = useState([]);

  const [editarPagamento, setEditarPagamento] = useState(null);
  const [novoStatus, setNovoStatus] = useState("pendente");

  const [editarParcela, setEditarParcela] = useState(null);
  const [novoStatusParcela, setNovoStatusParcela] = useState("pendente");

  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);

  // ================= CARREGAR =================
  const carregar = async () => {
    try {
      const [resProdutos, resFormas, resPagamentos, resVendas] = await Promise.all([
        api.get("/products/listar"),
        api.get("/formas-pagamento"),
        api.get("/pagamentos"),
        api.get("/vendas")
      ]);

      setProdutos(resProdutos.data || []);
      setFormas(resFormas.data || []);
      setPagamentos(resPagamentos.data || []);
      setVendas(resVendas.data || []);
    } catch (err) {
      console.error(err);
      setMensagem("Erro ao carregar dados");
    }
  };

  useEffect(() => { carregar(); }, []);

  // ================= VALOR =================
  useEffect(() => {
    const produto = produtos.find(p => Number(p.id) === Number(produtoId));
    setValor(produto ? Number(produto.preco) * quantidade : 0);
  }, [produtoId, quantidade, produtos]);

  // ================= PARCELAS =================
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

      const data = new Date();
      data.setMonth(data.getMonth() + i + 1);

      lista.push({
        numero: i + 1,
        valor: valorParcela,
        data_vencimento: data.toISOString().split("T")[0]
      });
    }

    setParcelas(lista);
  }, [valor, qtdParcelas]);

  // ================= CRIAR PAGAMENTO =================
  const criarPagamento = async () => {
    if (!produtoId || !quantidade || !formaPagamento) {
      setMensagem("Preencha todos os campos");
      return;
    }

    setLoading(true);
    setMensagem("");

    try {
      // 🔥 CRIAR VENDA
      const vendaRes = await api.post("/vendas", {
        itens: [{
          id_produto: Number(produtoId),
          quantidade: Number(quantidade)
        }]
      });

      const id_venda = vendaRes.data?.id;

      if (!id_venda) throw new Error("Erro ao criar venda");

      // 🔥 CRIAR PAGAMENTO (FORMATO CORRETO)
      await api.post("/pagamentos", {
        ids_vendas: [id_venda],
        id_forma_pagamento: Number(formaPagamento),
        parcelas
      });

      setMensagem("Pagamento criado com sucesso!");

      setProdutoId("");
      setQuantidade(1);
      setFormaPagamento("");
      setQtdParcelas(1);
      setParcelas([]);

      carregar();

    } catch (err) {
      console.error(err);
      setMensagem(err.response?.data?.erro || "Erro ao criar pagamento");
    } finally {
      setLoading(false);
    }
  };

  // ================= VER PARCELAS =================
  const verParcelas = async (p) => {
    try {
      const res = await api.get(`/pagamentos/${p.id}/parcelas`);
      setParcelasSelecionadas(res.data || []);
      setEditarPagamento(p);
    } catch {
      setMensagem("Erro ao buscar parcelas");
    }
  };

  // ================= EDITAR PAGAMENTO =================
  const salvarEdicao = async () => {
    try {
      await api.put(`/pagamentos/pago/${editarPagamento.id}`, {
        status: novoStatus
      });

      setEditarPagamento(null);
      carregar();
    } catch {
      setMensagem("Erro ao editar pagamento");
    }
  };

  // ================= EDITAR PARCELA =================
  const salvarParcela = async () => {
    try {
      await api.put(`/pagamentos/parcelas/${editarParcela.id}`, {
        status: novoStatusParcela
      });

      setEditarParcela(null);
      carregar();
    } catch {
      setMensagem("Erro ao atualizar parcela");
    }
  };

  const corStatus = (status) => {
    if (status === "pendente") return "text-danger fw-bold";
    if (status === "pago") return "text-success fw-bold";
    if (status === "cancelado") return "text-secondary fw-bold";
    return "";
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
                onChange={e => setProdutoId(e.target.value)}>
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
                onChange={e => setQuantidade(Number(e.target.value))}/>
            </div>

            <div className="col-md-2">
              <input className="form-control"
                value={`R$ ${valor.toFixed(2)}`} readOnly />
            </div>

            <div className="col-md-3">
              <select className="form-select" value={formaPagamento}
                onChange={e => setFormaPagamento(e.target.value)}>
                <option value="">Forma</option>
                {formas.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <input type="number" className="form-control"
                value={qtdParcelas}
                onChange={e => setQtdParcelas(Number(e.target.value))}/>
            </div>

          </div>

          <button className="btn btn-success mt-3"
            onClick={criarPagamento} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </div>

        {/* TABELA */}
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
                <td>
                  {p.itens?.length
                    ? p.itens.map(i => `${i.produto} (${i.quantidade})`).join(", ")
                    : "-"}
                </td>

                <td>R$ {Number(p.valor).toFixed(2)}</td>

                <td className={corStatus(p.status)}>
                  {p.status}
                </td>

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

        {/* MODAL PAGAMENTO */}
        {editarPagamento && (
          <div className="card p-3 mt-3 bg-light">
            <h5>Editar Pagamento #{editarPagamento.id}</h5>

            <select className="form-select mb-2"
              value={novoStatus}
              onChange={e => setNovoStatus(e.target.value)}>

              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="cancelado">Cancelado</option>
            </select>

            <button className="btn btn-success"
              onClick={salvarEdicao}>
              Salvar
            </button>
          </div>
        )}

        {/* MODAL PARCELAS */}
        {parcelasSelecionadas.length > 0 && (
          <div className="card p-3 mt-3">
            <h5>Parcelas</h5>

            <table className="table">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {parcelasSelecionadas.map(p => (
                  <tr key={p.id}>
                    <td>{p.numero_parcela}</td>
                    <td>R$ {Number(p.valor).toFixed(2)}</td>
                    <td>{p.status}</td>
                    <td>
                      <button className="btn btn-primary btn-sm"
                        onClick={() => {
                          setEditarParcela(p);
                          setNovoStatusParcela(p.status);
                        }}>
                        Editar
                      </button>
                    </td>
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
