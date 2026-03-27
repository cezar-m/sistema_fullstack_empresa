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
  };

  // ================= ABRIR MODAL STATUS =================
  const abrirStatus = (p) => {
    setEditarPagamento(p);
    setNovoStatus(p.status);
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

        <h3>Pagamentos</h3>

        <table className="table">
          <thead>
            <tr>
              <th>Valor</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pagamentos.map(p => (
              <tr key={p.id}>
                <td>R$ {Number(p.valor).toFixed(2)}</td>

                <td className={corStatus(p.status)}>
                  {p.status}
                </td>

                <td className="d-flex gap-2">

                  {/* VER PARCELAS */}
                  <button
                    className="btn btn-info btn-sm"
                    onClick={() => verParcelas(p)}>
                    Parcelas
                  </button>

                  {/* EDITAR STATUS */}
                  <button
                    className="btn btn-warning btn-sm"
                    onClick={() => abrirStatus(p)}>
                    Status
                  </button>

                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* MODAL STATUS PAGAMENTO */}
        {editarPagamento && (
          <div className="modal d-block">
            <div className="modal-dialog">
              <div className="modal-content p-3">

                <h5>Editar Status</h5>

                <select
                  className="form-select"
                  value={novoStatus}
                  onChange={e => setNovoStatus(e.target.value)}
                >
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                </select>

                <button
                  className="btn btn-success mt-2"
                  onClick={salvarEdicao}>
                  Salvar
                </button>

                <button
                  className="btn btn-secondary mt-2"
                  onClick={() => setEditarPagamento(null)}>
                  Cancelar
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
                  <div key={p.id}
                    className="d-flex justify-content-between border-bottom py-2">

                    <div>
                      Parcela {p.numero_parcela} - R$ {Number(p.valor).toFixed(2)} -{" "}
                      <span className={corStatus(p.status)}>
                        {p.status}
                      </span>
                    </div>

                    <button
                      className="btn btn-sm btn-warning"
                      onClick={() => {
                        setEditarParcela(p);
                        setNovoStatusParcela(p.status);
                      }}>
                      Editar
                    </button>

                  </div>
                ))}

                <button
                  className="btn btn-secondary mt-3"
                  onClick={() => setParcelasSelecionadas([])}>
                  Fechar
                </button>

              </div>
            </div>
          </div>
        )}

        {/* MODAL EDITAR PARCELA */}
        {editarParcela && (
          <div className="modal d-block">
            <div className="modal-dialog">
              <div className="modal-content p-3">

                <h5>Editar Parcela</h5>

                <select
                  className="form-select"
                  value={novoStatusParcela}
                  onChange={e => setNovoStatusParcela(e.target.value)}
                >
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                </select>

                <button
                  className="btn btn-success mt-2"
                  onClick={salvarParcela}>
                  Salvar
                </button>

                <button
                  className="btn btn-secondary mt-2"
                  onClick={() => setEditarParcela(null)}>
                  Cancelar
                </button>

              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
