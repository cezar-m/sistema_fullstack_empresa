import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import api from "../api/api";

export default function Pagamentos() {

  const [pagamentos, setPagamentos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [formas, setFormas] = useState([]);

  const [idProduto, setIdProduto] = useState("");
  const [idForma, setIdForma] = useState("");
  const [quantidade, setQuantidade] = useState(1);

  const [parcelas, setParcelas] = useState([]);
  const [qtdParcelas, setQtdParcelas] = useState("");

  const [editarPagamento, setEditarPagamento] = useState(null);
  const [novoStatus, setNovoStatus] = useState("pendente");

  const [erro, setErro] = useState("");

  /* =========================
     CARREGAR DADOS
  ========================= */
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [pag, prod, form] = await Promise.all([
        api.get("/pagamentos"),
        api.get("/produtos"),
        api.get("/formas-pagamento")
      ]);

      setPagamentos(pag.data);
      setProdutos(prod.data);
      setFormas(form.data);

    } catch (err) {
      console.error(err);
      setErro("Erro ao carregar dados");
    }
  };

  /* =========================
     GERAR PARCELAS
  ========================= */
  const gerarParcelas = (qtd) => {
    const lista = [];

    for (let i = 1; i <= qtd; i++) {
      lista.push({
        numero: i,
        valor: "",
        data_vencimento: ""
      });
    }

    setParcelas(lista);
  };

  /* =========================
     CRIAR PAGAMENTO
  ========================= */
  const criarPagamento = async () => {
    try {

      setErro("");

      await api.post("/pagamentos", {
        id_produto: idProduto,
        quantidade,
        id_forma_pagamento: idForma,
        parcelas
      });

      // reset
      setParcelas([]);
      setQtdParcelas("");
      setIdProduto("");
      setIdForma("");
      setQuantidade(1);

      carregarDados();

    } catch (err) {
      console.error(err);
      setErro(err.response?.data?.erro || "Erro ao salvar");
    }
  };

  /* =========================
     ATUALIZAR STATUS
  ========================= */
  const atualizarStatus = async () => {
    try {

      await api.put(`/pagamentos/${editarPagamento.id}`, {
        status: novoStatus
      });

      setEditarPagamento(null);
      carregarDados();

    } catch (err) {
      console.error(err);
      setErro("Erro ao atualizar");
    }
  };

  return (
    <>
      <Navbar />

      <div className="container mt-4">

        <h3>Pagamentos</h3>

        {erro && <div className="alert alert-danger">{erro}</div>}

        {/* =========================
            FORMULÁRIO
        ========================= */}
        <div className="card p-3 mb-3">

          <div className="row">

            <div className="col-md-4">
              <select
                className="form-control"
                value={idProduto}
                onChange={(e) => setIdProduto(e.target.value)}
              >
                <option value="">Selecione Produto</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <select
                className="form-control"
                value={idForma}
                onChange={(e) => setIdForma(e.target.value)}
              >
                <option value="">Forma Pagamento</option>
                {formas.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <input
                type="number"
                className="form-control"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="Quantidade"
              />
            </div>

          </div>

          {/* PARCELAS */}
          <div className="mt-3">
            <input
              type="number"
              className="form-control"
              placeholder="Quantidade de parcelas"
              value={qtdParcelas}
              onChange={(e) => {
                const qtd = parseInt(e.target.value) || 0;
                setQtdParcelas(e.target.value);
                gerarParcelas(qtd);
              }}
            />
          </div>

          {parcelas.map((p, i) => (
            <div key={i} className="row mt-2">

              <div className="col-md-2">
                <input className="form-control" value={p.numero} readOnly />
              </div>

              <div className="col-md-5">
                <input
                  className="form-control"
                  placeholder="Valor"
                  onChange={(e) => {
                    const nova = [...parcelas];
                    nova[i].valor = e.target.value;
                    setParcelas(nova);
                  }}
                />
              </div>

              <div className="col-md-5">
                <input
                  type="date"
                  className="form-control"
                  onChange={(e) => {
                    const nova = [...parcelas];
                    nova[i].data_vencimento = e.target.value;
                    setParcelas(nova);
                  }}
                />
              </div>

            </div>
          ))}

          <button
            className="btn btn-success mt-3"
            onClick={criarPagamento}
          >
            Criar Pagamento
          </button>

        </div>

        {/* =========================
            LISTA
        ========================= */}
        <div className="card p-3">

          {pagamentos.map(p => (
            <div key={p.id} className="d-flex justify-content-between border-bottom py-2">

              <div>
                <strong>{p.nome_produto || "Produto"}</strong><br />
                Status: {p.status}
              </div>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setEditarPagamento(p);
                  setNovoStatus(p.status);
                }}
              >
                Editar
              </button>

            </div>
          ))}

        </div>

        {/* =========================
            MODAL EDITAR
        ========================= */}
        {editarPagamento && (
          <div className="card p-3 mt-3">

            <h5>Editar Pagamento #{editarPagamento.id}</h5>

            <select
              className="form-control mb-2"
              value={novoStatus}
              onChange={(e) => setNovoStatus(e.target.value)}
            >
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="cancelado">Cancelado</option>
            </select>

            <button className="btn btn-success" onClick={atualizarStatus}>
              Salvar
            </button>

            <button
              className="btn btn-secondary mt-2"
              onClick={() => setEditarPagamento(null)}
            >
              Cancelar
            </button>

          </div>
        )}

      </div>
    </>
  );
}
