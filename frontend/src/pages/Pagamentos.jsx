import { useState, useEffect } from "react";
import api from "../api/api";

export default function Pagamentos() {

  const [produtos, setProdutos] = useState([]);
  const [formas, setFormas] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);

  const [produtoId, setProdutoId] = useState("");
  const [formaId, setFormaId] = useState("");
  const [quantidade, setQuantidade] = useState(1);

  const [parcelas, setParcelas] = useState([]);
  const [qtdParcelas, setQtdParcelas] = useState(0);

  const [editar, setEditar] = useState(null);
  const [status, setStatus] = useState("pendente");

  /* ========================= */
  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    const [p, f, pag] = await Promise.all([
      api.get("/products/listar"),
      api.get("/formas-pagamento"),
      api.get("/pagamentos")
    ]);

    setProdutos(p.data);
    setFormas(f.data);
    setPagamentos(pag.data);
  };

  /* ========================= */
  const gerarParcelas = (qtd) => {
    const lista = [];
    for (let i = 1; i <= qtd; i++) {
      lista.push({ numero: i, valor: "", data_vencimento: "" });
    }
    setParcelas(lista);
  };

  /* ========================= */
  const salvar = async () => {
    await api.post("/pagamentos", {
      id_produto: produtoId,
      quantidade,
      id_forma_pagamento: formaId,
      parcelas
    });

    setParcelas([]);
    setQtdParcelas(0);
    carregar();
  };

  /* ========================= */
  const atualizar = async () => {
    await api.put(`/pagamentos/${editar.id}`, { status });
    setEditar(null);
    carregar();
  };

  return (
    <div className="container mt-4">

      <h3>Pagamentos</h3>

      {/* FORM */}
      <div className="row mb-3">

        <select onChange={(e)=>setProdutoId(e.target.value)}>
          <option>Produto</option>
          {produtos.map(p => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>

        <select onChange={(e)=>setFormaId(e.target.value)}>
          <option>Forma</option>
          {formas.map(f => (
            <option key={f.id} value={f.id}>{f.nome}</option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Qtd parcelas"
          onChange={(e)=>{
            setQtdParcelas(e.target.value);
            gerarParcelas(e.target.value);
          }}
        />

        <button onClick={salvar}>Salvar</button>
      </div>

      {/* PARCELAS */}
      {parcelas.map((p,i)=>(
        <div key={i}>
          <input value={p.numero} readOnly />
          <input placeholder="valor"
            onChange={(e)=>{
              const nova=[...parcelas];
              nova[i].valor=e.target.value;
              setParcelas(nova);
            }}
          />
          <input type="date"
            onChange={(e)=>{
              const nova=[...parcelas];
              nova[i].data_vencimento=e.target.value;
              setParcelas(nova);
            }}
          />
        </div>
      ))}

      {/* LISTA */}
      {pagamentos.map(p=>(
        <div key={p.id}>
          {p.nome_produto} - {p.status}

          <button onClick={()=>{
            setEditar(p);
            setStatus(p.status);
          }}>
            Editar
          </button>
        </div>
      ))}

      {/* MODAL */}
      {editar && (
        <div style={{border:"1px solid", padding:20}}>
          <h4>Editar</h4>

          <select value={status} onChange={(e)=>setStatus(e.target.value)}>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
          </select>

          <button onClick={atualizar}>Salvar</button>
          <button onClick={()=>setEditar(null)}>Fechar</button>
        </div>
      )}

    </div>
  );
}
