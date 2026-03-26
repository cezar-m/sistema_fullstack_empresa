import { useState, useEffect } from "react";
import api from "../api/api";
import DashboardLayout from "../layouts/DashboardLayout";

export default function Pagamentos() {

  const [produtos, setProdutos] = useState([]);
  const [formas, setFormas] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [vendas, setVendas] = useState([]);

  const [selecionadas, setSelecionadas] = useState([]);

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
      const [p, f, pg, v] = await Promise.all([
        api.get("/products/listar"),
        api.get("/formas-pagamento"),
        api.get("/pagamentos"),
        api.get("/vendas")
      ]);

      setProdutos(p.data || []);
      setFormas(f.data || []);
      setPagamentos(pg.data || []);
      setVendas(v.data || []);
    } catch (err) {
      console.error(err);
      setMensagem("Erro ao carregar dados");
    }
  };

  useEffect(() => { carregar(); }, []);

  // ================= VALOR =================
  useEffect(() => {
    const prod = produtos.find(p => Number(p.id) === Number(produtoId));
    setValor(prod ? prod.preco * quantidade : 0);
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
      let v = Number((valor / qtdParcelas).toFixed(2));
      if (i === qtdParcelas - 1) v = Number((valor - soma).toFixed(2));

      soma += v;

      const data = new Date();
      data.setMonth(data.getMonth() + i + 1);

      lista.push({
        numero: i + 1,
        valor: v,
        data_vencimento: data.toISOString().split("T")[0]
      });
    }

    setParcelas(lista);
  }, [valor, qtdParcelas]);

  // ================= SELECIONAR VENDA =================
  const toggleVenda = (id) => {
    setSelecionadas(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  // ================= CRIAR VENDA + PAGAMENTO =================
  const criarVendaEPagar = async () => {
    if (!produtoId || !quantidade || !formaPagamento) {
      setMensagem("Preencha os campos");
      return;
    }

    setLoading(true);

    try {
      const venda = await api.post("/vendas", {
        itens: [{
          id_produto: Number(produtoId),
          quantidade: Number(quantidade)
        }]
      });

      await api.post("/pagamentos", {
        ids_vendas: [venda.data.id],
        id_forma_pagamento: Number(formaPagamento),
        parcelas
      });

      setMensagem("Venda + pagamento OK");

      setProdutoId("");
      setQuantidade(1);
      setQtdParcelas(1);

      carregar();

    } catch (err) {
      setMensagem(err.response?.data?.erro || "Erro");
    } finally {
      setLoading(false);
    }
  };

  // ================= PAGAR VENDAS EXISTENTES =================
  const pagarSelecionadas = async () => {
    if (!selecionadas.length) {
      setMensagem("Selecione vendas");
      return;
    }

    try {
      await api.post("/pagamentos", {
        ids_vendas: selecionadas,
        id_forma_pagamento: Number(formaPagamento)
      });

      setSelecionadas([]);
      setMensagem("Pagamentos realizados");

      carregar();

    } catch (err) {
      setMensagem(err.response?.data?.erro);
    }
  };

  // ================= VER PARCELAS =================
  const verParcelas = async (p) => {
    const res = await api.get(`/pagamentos/${p.id}/parcelas`);
    setParcelasSelecionadas(res.data);
    setEditarPagamento(p);
  };

  // ================= EDITAR PAGAMENTO =================
  const salvarEdicao = async () => {
    await api.put(`/pagamentos/pago/${editarPagamento.id}`, {
      status: novoStatus
    });

    setEditarPagamento(null);
    carregar();
  };

  // ================= EDITAR PARCELA =================
  const salvarParcela = async () => {
    await api.put(`/pagamentos/parcelas/${editarParcela.id}`, {
      status: novoStatusParcela
    });

    setEditarParcela(null);
    carregar();
  };

  const corStatus = (s) => {
    if (s === "pago") return "text-success";
    if (s === "pendente") return "text-danger";
    return "text-secondary";
  };

  return (
    <DashboardLayout>
      <div className="container mt-4">

        <h3>Nova Venda + Pagamento</h3>

        <div className="card p-3 mb-3">
          <div className="row">

            <div className="col">
              <select className="form-select"
                value={produtoId}
                onChange={e => setProdutoId(e.target.value)}>
                <option value="">Produto</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nome} - R$ {p.preco}
                  </option>
                ))}
              </select>
            </div>

            <div className="col">
              <input type="number" className="form-control"
                value={quantidade}
                onChange={e => setQuantidade(Number(e.target.value))}/>
            </div>

            <div className="col">
              <input className="form-control" value={valor} readOnly />
            </div>

            <div className="col">
              <select className="form-select"
                value={formaPagamento}
                onChange={e => setFormaPagamento(e.target.value)}>
                <option value="">Forma</option>
                {formas.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>

            <div className="col">
              <input type="number" className="form-control"
                value={qtdParcelas}
                onChange={e => setQtdParcelas(Number(e.target.value))}/>
            </div>

          </div>

          <button className="btn btn-success mt-3"
            onClick={criarVendaEPagar}>
            Salvar
          </button>
        </div>

        <h3>Vendas Pendentes</h3>

        <table className="table">
          <tbody>
            {vendas.filter(v => !v.pago).map(v => (
              <tr key={v.id}>
                <td>
                  <input type="checkbox"
                    onChange={() => toggleVenda(v.id)} />
                </td>
                <td>{v.itens.map(i => i.produto).join(", ")}</td>
                <td>{v.total}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <button className="btn btn-primary" onClick={pagarSelecionadas}>
          Pagar selecionadas
        </button>

        <hr />

        <h3>Pagamentos</h3>

        <table className="table">
          <tbody>
            {pagamentos.map(p => (
              <tr key={p.id}>
                <td>{p.valor}</td>
                <td className={corStatus(p.status)}>{p.status}</td>
                <td>
                  <button className="btn btn-info"
                    onClick={() => verParcelas(p)}>
                    Parcelas
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* MODAL PAGAMENTO */}
        {editarPagamento && (
          <div className="modal d-block">
            <div className="modal-dialog">
              <div className="modal-content p-3">

                <h5>Editar</h5>

                <select className="form-select"
                  value={novoStatus}
                  onChange={e => setNovoStatus(e.target.value)}>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                </select>

                <button className="btn btn-success mt-2"
                  onClick={salvarEdicao}>
                  Salvar
                </button>

              </div>
            </div>
          </div>
        )}

        {/* MODAL PARCELAS */}
        {parcelasSelecionadas.length > 0 && (
          <div className="modal d-block">
            <div className="modal-dialog">
              <div className="modal-content p-3">

                <h5>Parcelas</h5>

                {parcelasSelecionadas.map(p => (
                  <div key={p.id}>
                    {p.numero_parcela} - {p.valor}
                    <button
                      onClick={() => {
                        setEditarParcela(p);
                        setNovoStatusParcela(p.status);
                      }}>
                      Editar
                    </button>
                  </div>
                ))}

              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
