import { useState, useEffect } from "react";
import api from "../api/api";

export default function Pagamentos() {

  const [produtos, setProdutos] = useState([]);
  const [formas, setFormas] = useState([]);

  const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [formaPagamentoId, setFormaPagamentoId] = useState("");

  const [parcelas, setParcelas] = useState([]);
  const [qtdParcelas, setQtdParcelas] = useState(0);

  const [msg, setMsg] = useState("");

  /* =========================
     CARREGAR DADOS
  ========================= */
  useEffect(() => {
    const load = async () => {
      try {
        const [p, f] = await Promise.all([
          api.get("/products/listar"),
          api.get("/formas-pagamento")
        ]);

        setProdutos(p.data || []);
        setFormas(f.data || []);
      } catch (err) {
        console.error(err);
      }
    };

    load();
  }, []);

  /* =========================
     GERAR PARCELAS (NÃO SOME)
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
     ALTERAR PARCELA
  ========================= */
  const alterarParcela = (index, campo, valor) => {
    const nova = [...parcelas];
    nova[index][campo] = valor;
    setParcelas(nova);
  };

  /* =========================
     SALVAR
  ========================= */
  const salvar = async () => {
    try {
      if (!produtoId || !formaPagamentoId) {
        setMsg("Selecione produto e forma");
        return;
      }

      const payload = {
        id_produto: Number(produtoId),
        quantidade: Number(quantidade),
        id_forma_pagamento: Number(formaPagamentoId),
        parcelas: parcelas.filter(p =>
          p.numero && p.valor && p.data_vencimento
        )
      };

      console.log("PAYLOAD:", payload);

      await api.post("/pagamentos", payload);

      setMsg("Salvo com sucesso");

      // RESET SEM QUEBRAR TUDO
      setProdutoId("");
      setQuantidade(1);
      setFormaPagamentoId("");
      setParcelas([]);
      setQtdParcelas(0);

    } catch (err) {
      console.error(err);
      setMsg(err.response?.data?.erro || "Erro ao salvar");
    }
  };

  return (
    <div className="container mt-4">

      <h3>Pagamentos</h3>

      {msg && <div className="alert alert-info">{msg}</div>}

      <div className="card p-3 mb-3">
        <div className="row g-2">

          {/* PRODUTO */}
          <div className="col-md-3">
            <select
              className="form-select"
              value={produtoId || ""}
              onChange={(e) => setProdutoId(e.target.value)}
            >
              <option value="">Produto</option>
              {produtos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          {/* QTD */}
          <div className="col-md-2">
            <input
              type="number"
              className="form-control"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </div>

          {/* FORMA */}
          <div className="col-md-3">
            <select
              className="form-select"
              value={formaPagamentoId || ""}
              onChange={(e) => setFormaPagamentoId(e.target.value)}
            >
              <option value="">Forma pagamento</option>
              {formas.map(f => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>

          {/* QTD PARCELAS */}
          <div className="col-md-2">
            <input
              type="number"
              className="form-control"
              placeholder="Parcelas"
              value={qtdParcelas}
              onChange={(e) => {
                const val = Number(e.target.value);
                setQtdParcelas(val);
                gerarParcelas(val);
              }}
            />
          </div>

          {/* BOTÃO */}
          <div className="col-md-2">
            <button className="btn btn-success w-100" onClick={salvar}>
              Salvar
            </button>
          </div>

        </div>
      </div>

      {/* PARCELAS */}
      {parcelas.length > 0 && (
        <div className="card p-3">
          <h5>Parcelas</h5>

          {parcelas.map((p, index) => (
            <div key={index} className="row mb-2">

              <div className="col-md-2">
                <input
                  className="form-control"
                  value={p.numero}
                  readOnly
                />
              </div>

              <div className="col-md-4">
                <input
                  type="number"
                  className="form-control"
                  placeholder="Valor"
                  value={p.valor}
                  onChange={(e) =>
                    alterarParcela(index, "valor", e.target.value)
                  }
                />
              </div>

              <div className="col-md-4">
                <input
                  type="date"
                  className="form-control"
                  value={p.data_vencimento}
                  onChange={(e) =>
                    alterarParcela(index, "data_vencimento", e.target.value)
                  }
                />
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
