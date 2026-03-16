// pages/FormasPagamento.jsx
import { useState, useEffect } from "react";
import api from "../api/api";
import DashboardLayout from "../layouts/DashboardLayout";

export default function FormasPagamento() {
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [nome, setNome] = useState("");
  const [ativo, setAtivo] = useState(1); // 1 = Ativo, 0 = Inativo
  const [editadoId, setEditadoId] = useState(null);

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const formasPorPagina = 16;

  /* =========================
     CARREGAR FORMAS
  ========================== */
  const carregarFormas = async () => {
    try {
      const res = await api.get("/formas-pagamento");
      if (Array.isArray(res.data)) {
        setFormasPagamento(res.data);
      } else {
        setFormasPagamento([]);
      }
    } catch (err) {
      console.error("Erro ao carregar formas:", err);
      alert(err?.response?.data?.erro || "Erro ao carregar formas");
    }
  };

  useEffect(() => {
    carregarFormas();
  }, []);

  /* =========================
     LIMPAR FORMULÁRIO
  ========================== */
  const limpar = () => {
    setNome("");
    setAtivo(1);
    setEditadoId(null);
  };

  /* =========================
     CRIAR / ATUALIZAR
  ========================== */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nome.trim()) {
      alert("O nome da forma de pagamento é obrigatório");
      return;
    }

    try {
      const payload = { nome: nome.trim(), ativo: Number(ativo) };
      if (editadoId) {
        await api.put(`/formas-pagamento/${editadoId}`, payload);
      } else {
        await api.post("/formas-pagamento", payload);
      }

      limpar();
      setPaginaAtual(1);
      carregarFormas();
    } catch (err) {
      console.error("Erro ao salvar forma:", err);
      alert(err?.response?.data?.erro || "Erro ao salvar forma de pagamento");
    }
  };

  /* =========================
     EDITAR
  ========================== */
  const editar = (forma) => {
    setNome(forma.nome);
    setAtivo(Number(forma.ativo));
    setEditadoId(forma.id);
  };

  /* =========================
     EXCLUIR
  ========================== */
  const excluir = async (id) => {
    if (!window.confirm("Deseja excluir esta forma de pagamento?")) return;

    try {
      await api.delete(`/formas-pagamento/${id}`);

      // Ajusta paginação se necessário
      const total = formasPagamento.length - 1;
      const ultimaPagina = Math.ceil(total / formasPorPagina);
      if (paginaAtual > ultimaPagina && paginaAtual > 1) {
        setPaginaAtual(paginaAtual - 1);
      }

      carregarFormas();
    } catch (err) {
      console.error("Erro ao excluir forma:", err);
      alert(err?.response?.data?.erro || "Erro ao excluir forma de pagamento");
    }
  };

  /* =========================
     PAGINAÇÃO
  ========================== */
  const indexUltimo = paginaAtual * formasPorPagina;
  const indexPrimeiro = indexUltimo - formasPorPagina;
  const formasPagina = formasPagamento.slice(indexPrimeiro, indexUltimo);
  const totalPaginas = Math.ceil(formasPagamento.length / formasPorPagina);

  /* =========================
     RENDER
  ========================== */
  return (
    <DashboardLayout>
      <div className="mb-2">
        <h2>Formas de Pagamento</h2>

        {/* FORMULÁRIO */}
        <form onSubmit={handleSubmit} className="card p-3 mb-4">
          <div className="d-flex align-items-center mb-2 gap-2">
            <label className="fw-semibold mb-0" style={{ width: "220px" }}>
              Nome da Forma de Pagamento:
            </label>
            <input
              className="form-control w-75"
              placeholder="Nome da forma de pagamento"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="d-flex align-items-center mb-2 gap-2">
            <label className="fw-semibold mb-0" style={{ width: "220px" }}>
              Status:
            </label>
            <select
              className="form-control w-25"
              value={ativo}
              onChange={(e) => setAtivo(Number(e.target.value))}
            >
              <option value={1}>Ativo</option>
              <option value={0}>Inativo</option>
            </select>
          </div>

          <div className="text-start">
            <button type="submit" className="btn btn-success">
              {editadoId ? "Atualizar" : "Cadastrar"}
            </button>
          </div>
        </form>

        {/* TABELA */}
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {formasPagina.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center">
                  Nenhuma forma de pagamento encontrada
                </td>
              </tr>
            )}

            {formasPagina.map((forma) => (
              <tr key={forma.id}>
                <td>{forma.nome}</td>
                <td>{forma.ativo === 1 ? "Ativo" : "Inativo"}</td>
                <td>
                  <button
                    className="btn btn-warning btn-sm me-2"
                    onClick={() => editar(forma)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => excluir(forma.id)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* PAGINAÇÃO */}
        {totalPaginas > 1 && (
          <nav>
            <ul className="pagination">
              {Array.from({ length: totalPaginas }, (_, i) => (
                <li
                  key={i}
                  className={`page-item ${paginaAtual === i + 1 ? "active" : ""}`}
                >
                  <button
                    className="page-link"
                    onClick={() => setPaginaAtual(i + 1)}
                  >
                    {i + 1}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </DashboardLayout>
  );
}
