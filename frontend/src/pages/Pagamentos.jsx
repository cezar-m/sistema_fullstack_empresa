import { useState, useEffect } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../api/api";

export default function Pagamentos() {

  const [produtos, setProdutos] = useState([]);
  const [formas, setFormas] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);

  const [produtoId, setProdutoId] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [valor, setValor] = useState(0);

  const [qtdParcelas, setQtdParcelas] = useState(1);
  const [parcelas, setParcelas] = useState([]);

  const [verParcelas, setVerParcelas] = useState(null);

  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 5;

  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    const p = await api.get("/products/listar");
    const f = await api.get("/formas-pagamento");
    const pg = await api.get("/pagamentos");

    setProdutos(p.data);
    setFormas(f.data);
    setPagamentos(pg.data);
  };

  // calcular valor
  useEffect(() => {
    const produto = produtos.find(p => p.id == produtoId);
    if (produto) setValor(produto.preco * quantidade);
  }, [produtoId, quantidade]);

  // gerar parcelas
  useEffect(() => {
    if (qtdParcelas <= 1) return setParcelas([]);

    const base = (valor / qtdParcelas).toFixed(2);
    let lista = [];

    for (let i = 0; i < qtdParcelas; i++) {
      lista.push({
        numero: i + 1,
        valor: Number(base),
        status: "pendente"
      });
    }

    setParcelas(lista);
  }, [qtdParcelas, valor]);

  const criar = async () => {
    try {
      await api.post("/pagamentos", {
        id_produto: Number(produtoId),
        quantidade: Number(quantidade),
        id_forma_pagamento: Number(formaPagamento),
        parcelas
      });

      setMensagem("Criado!");
      carregar();
    } catch (e) {
      console.error(e);
      setMensagem("Erro ao criar");
    }
  };

  // PAGINAÇÃO
  const inicio = (pagina - 1) * itensPorPagina;
  const lista = pagamentos.slice(inicio, inicio + itensPorPagina);

  return (
    <DashboardLayout>
      <div className="container mt-4">

        <h3>Pagamentos</h3>

        {mensagem && <div className="alert alert-info">{mensagem}</div>}

        {/* FORM */}
        <div className="card p-3 mb-3">

          <select className="form-select mb-2"
            onChange={e => setProdutoId(e.target.value)}>
            <option>Produto</option>
            {produtos.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>

          <input type="number" className="form-control mb-2"
            value={quantidade}
            onChange={e => setQuantidade(e.target.value)}
          />

          <select className="form-select mb-2"
            onChange={e => setFormaPagamento(e.target.value)}>
            <option>Forma</option>
            {formas.map(f => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>

          <input type="number" className="form-control mb-2"
            value={qtdParcelas}
            onChange={e => setQtdParcelas(e.target.value)}
          />

          <button className="btn btn-success" onClick={criar}>
            Criar
          </button>

        </div>

        {/* LISTA */}
        <table className="table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Valor</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {lista.map(p => (
              <tr key={p.id}>
                <td>{p.nome_produto}</td>
                <td>R$ {p.valor}</td>

                <td>
                  <button className="btn btn-info btn-sm"
                    onClick={() => setVerParcelas(p)}>
                    Parcelas
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* PAGINAÇÃO */}
        <div>
          <button onClick={() => setPagina(p => p - 1)}>Anterior</button>
          <span> Página {pagina} </span>
          <button onClick={() => setPagina(p => p + 1)}>Próxima</button>
        </div>

        {/* MODAL PARCELAS */}
        {verParcelas && (
          <div className="modal d-block">
            <div className="modal-dialog">
              <div className="modal-content p-3">

                <h5>Parcelas</h5>

                {verParcelas.parcelas?.map(p => (
                  <div key={p.numero}>
                    {p.numero} - R$ {p.valor} - {p.status}
                  </div>
                ))}

                <button
                  className="btn btn-secondary mt-2"
                  onClick={() => setVerParcelas(null)}>
                  Fechar
                </button>

              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
