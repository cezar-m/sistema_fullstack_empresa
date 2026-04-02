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
        api.get("/products/meus"),
        api.get("/formas-pagamento"),
        api.get("/pagamentos"),
        api.get("/vendas")
      ]);

      setProdutos(p.data || []);
      setFormas(f.data || []);
      setPagamentos(pg.data || []);
      setVendas(v.data || []);
      setSelecionadas([]);

    } catch (err) {
      console.error(err);
      setMensagem("Erro ao carregar dados");
    }
  };

  useEffect(() => { carregar(); }, []);

  // 🔥 SUMIR MENSAGEM EM 3 SEGUNDOS
  useEffect(() => {
    if (!mensagem) return;

    const timer = setTimeout(() => {
      setMensagem("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [mensagem]);

  // ================= VALOR =================
  useEffect(() => {
    const prod = produtos.find(p => Number(p.id) === Number(produtoId));
    setValor(prod ? prod.preco * quantidade : 0);
  }, [produtoId, quantidade, produtos]);

  // ================= PARCELAS =================
  useEffect(() => {

    if (!selecionadas.length || qtdParcelas <= 1) {
      setParcelas([]);
      return;
    }

    const total = vendas
      .filter(v => selecionadas.includes(v.id))
      .reduce((acc, v) => acc + Number(v.total), 0);

    if (!total) {
      setParcelas([]);
      return;
    }

    const lista = [];
    let soma = 0;

    for (let i = 0; i < qtdParcelas; i++) {
      let v = Number((total / qtdParcelas).toFixed(2));
      if (i === qtdParcelas - 1) v = Number((total - soma).toFixed(2));

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

  }, [selecionadas, qtdParcelas, vendas]);

  // ================= SELECIONAR VENDA =================
  const toggleVenda = (id) => {
    setSelecionadas(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  // ================= PAGAR VENDAS =================
  const pagarSelecionadas = async () => {

    if (!selecionadas.length) {
      setMensagem("Selecione vendas");
      return;
    }

    if (!formaPagamento) {
      setMensagem("Forma de pagamento obrigatória");
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      await api.post("/pagamentos", {
        ids_vendas: selecionadas,
        id_forma_pagamento: Number(formaPagamento),
        parcelas
      });

      setMensagem("Pagamentos realizados");

      setSelecionadas([]);
      setFormaPagamento("");
      setQtdParcelas(1);
      setParcelas([]);

      await carregar();

    } catch (err) {
      setMensagem(err.response?.data?.erro || "Erro ao pagar");
    } finally {
      setLoading(false);
    }
  };

  // ================= VER PARCELAS =================
  const verParcelas = async (p) => {
    const res = await api.get(`/pagamentos/${p.id}/parcelas`);
    setParcelasSelecionadas(res.data);
  };

  // ================= ABRIR STATUS =================
  const abrirStatus = (p) => {
    setEditarPagamento(p);
    setNovoStatus(String(p.status).toLowerCase().trim()); // 🔥 importante
  };

  // ================= EDITAR PAGAMENTO =================
  const salvarEdicao = async () => {
   try {

     await api.put(`/pagamentos/pago/${editarPagamento.id}`, {
      status: String(novoStatus).toLowerCase().trim()
   });

    // 🔥 ATUALIZA DIRETO NO STATE (SEM ESPERAR BACKEND)
    setPagamentos(prev =>
      prev.map(p =>
        p.id === editarPagamento.id
          ? { ...p, status: novoStatus }
          : p
      )
     );

     setMensagem("Status atualizado com sucesso");

     setEditarPagamento(null);

   } catch (err) {
     console.error(err);
     setMensagem(err?.response?.data?.erro || "Erro ao atualizar status");
   }
 };

  // ================= EDITAR PARCELA =================
 const salvarParcela = async () => {
  try {

    await api.put(`/pagamentos/parcelas/${editarParcela.id}`, {
      status: String(novoStatusParcela).toLowerCase().trim()
    });

    // 🔥 atualiza na tela na hora
    setParcelasSelecionadas(prev =>
      prev.map(p =>
        p.id === editarParcela.id
          ? { ...p, status: novoStatusParcela }
          : p
      )
    );

    setMensagem("Parcela atualizada com sucesso");

    setEditarParcela(null);

  } catch (err) {
    console.error(err);
    setMensagem(err?.response?.data?.erro || "Erro ao atualizar parcela");
  }
};

  const corStatus = (s) => {
  const status = String(s || "").toLowerCase().trim();

  if (status === "pago") return "text-success";
  if (status === "pendente") return "text-danger";

  return "text-secondary";
};

  return (
    <DashboardLayout>
      <div className="container mt-4">

        {mensagem && (
          <div className="alert alert-success">{mensagem}</div>
        )}

        <h3>Vendas Pendentes</h3>

        <div className="card p-3 mb-3">

          <div className="row mb-2">
            <div className="col">
              <select className="form-select"
                value={formaPagamento}
                onChange={e => setFormaPagamento(e.target.value)}>
                <option value="">Forma de pagamento</option>
                {formas.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>

            <div className="col">
              <input
                type="number"
                className="form-control"
                placeholder="Qtd Parcelas"
                value={qtdParcelas}
                onChange={e => setQtdParcelas(Number(e.target.value))}
              />
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>Produtos</th>
                <th>Qtd</th>
                <th>Total</th>
              </tr>
            </thead>

            <tbody>
              {vendas.filter(v => !v.pago).map(v => (
                <tr key={v.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selecionadas.includes(v.id)}
                      onChange={() => toggleVenda(v.id)}
                    />
                  </td>

                  <td>{v.itens.map(i => i.produto).join(", ")}</td>
                  <td>{v.itens.map(i => i.quantidade).join(", ")}</td>
                  <td>R$ {Number(v.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            className="btn btn-primary mt-2"
            disabled={loading || !selecionadas.length}
            onClick={pagarSelecionadas}
          >
            {loading ? "Processando..." : "Pagar selecionadas"}
          </button>

        </div>

        <h3>Pagamentos</h3>

        <table className="table">
          <tbody>
            {pagamentos.map(p => (
              <tr key={p.id}>
                <td>R$ {Number(p.valor).toFixed(2)}</td>

                <td className={corStatus(p.status)}>
                  {p.status}
                </td>

                <td className="d-flex gap-2">
                  <button
                    className="btn btn-info btn-sm"
                    onClick={() => verParcelas(p)}>
                    Parcelas
                  </button>

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

        {/* 🔥 AGORA PARCELAS EMBAIXO (SEM MODAL) */}
        {parcelasSelecionadas.length > 0 && (
          <div className="card p-3 mt-3">
            <h5>Parcelas</h5>

           <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Valor</th>
                  <th>Vencimento</th> {/* 🔥 NOVO */}
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
            
              <tbody>
                {parcelasSelecionadas.map(p => (
                  <tr key={p.id}>
                    <td>{p.numero_parcela}</td>
            
                    <td>R$ {Number(p.valor).toFixed(2)}</td>
            
                    <td>
                      {p.data_vencimento
                        ? new Date(p.data_vencimento).toLocaleDateString("pt-BR")
                        : "-"}
                    </td>
            
                    <td className={corStatus(p.status)}>
                      {p.status}
                    </td>
            
                    <td>
                      <button
                        className="btn btn-warning btn-sm"
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
            
            <button
              className="btn btn-secondary"
              onClick={() => setParcelasSelecionadas([])}>
              Fechar
            </button>
          </div>
        )}

        {/* MODAL STATUS */}
        {editarPagamento && (
          <div className="modal d-block">
            <div className="modal-dialog">
              <div className="modal-content p-3">

                <h5>Editar Status</h5>

               <select
                  className="form-select"
                  value={String(novoStatus).toLowerCase().trim()}
                  onChange={e => setNovoStatus(e.target.value)}
               >
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                </select>

                <button className="btn btn-success mt-2"
                  onClick={salvarEdicao}>
                  Salvar
                </button>

                <button className="btn btn-secondary mt-2"
                  onClick={() => setEditarPagamento(null)}>
                  Cancelar
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
                  value={String(novoStatusParcela).toLowerCase().trim()}
                  onChange={e => setNovoStatusParcela(e.target.value)}
                >
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                </select>

                <button className="btn btn-success mt-2"
                  onClick={salvarParcela}>
                  Salvar
                </button>

                <button className="btn btn-secondary mt-2"
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
