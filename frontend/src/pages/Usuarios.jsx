import { useEffect, useState } from "react";
import api from "../api/api";
import DashboardLayout from "../layouts/DashboardLayout";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [mensagem, setMensagem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState(null);

  // =========================
  // LISTAR USUÁRIOS
  // =========================
  useEffect(() => {
    listarUsuarios();
  }, []);

  // AUTO FECHAR ALERTA
  useEffect(() => {
    if (mensagem) {
      const timer = setTimeout(() => {
        setMensagem(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [mensagem]);

  const listarUsuarios = async () => {
    try {
      setLoading(true);
      const res = await api.get("/users");
      setUsuarios(res.data || []);
    } catch (err) {
      console.error(err);
      setMensagem({
        texto: err.response?.data?.erro || "Erro ao carregar usuários",
        tipo: "alert-danger"
      });
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // DELETAR USUÁRIO
  // =========================
  const deletarUsuario = async () => {
    if (!usuarioParaExcluir) return;

    try {
      await api.delete(`/users/${usuarioParaExcluir.id}`);

      setUsuarios((prev) =>
        prev.filter((u) => u.id !== usuarioParaExcluir.id)
      );

      setMensagem({
        texto: "Usuário excluído com sucesso!",
        tipo: "alert-success"
      });

    } catch (err) {
      console.error(err);

      setMensagem({
        texto: err.response?.data?.erro || "Erro ao excluir usuário",
        tipo: "alert-danger"
      });
    } finally {
      setUsuarioParaExcluir(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mt-4">
        <h3>Usuários</h3>

        {/* ALERTA PROFISSIONAL */}
        {mensagem && (
          <div
            className={`alert ${mensagem.tipo} alert-dismissible fade show`}
            role="alert"
          >
            {mensagem.texto}
            <button
              type="button"
              className="btn-close"
              onClick={() => setMensagem(null)}
            ></button>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="alert alert-warning">
            Carregando...
          </div>
        )}

        {/* TABELA */}
        <table className="table table-striped table-bordered mt-3">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Acesso</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.nome}</td>
                <td>{u.email}</td>
                <td>
                  <span
                    className={
                      u.acesso === "admin"
                        ? "badge bg-danger"
                        : "badge bg-secondary"
                    }
                  >
                    {u.acesso}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => setUsuarioParaExcluir(u)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* MODAL DE CONFIRMAÇÃO */}
        {usuarioParaExcluir && (
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">

                <div className="modal-header">
                  <h5 className="modal-title">
                    Confirmar exclusão
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setUsuarioParaExcluir(null)}
                  ></button>
                </div>

                <div className="modal-body">
                  <p>
                    Deseja realmente excluir o usuário{" "}
                    <strong>{usuarioParaExcluir.nome}</strong>?
                  </p>
                </div>

                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setUsuarioParaExcluir(null)}
                  >
                    Cancelar
                  </button>

                  <button
                    className="btn btn-danger"
                    onClick={deletarUsuario}
                  >
                    Excluir
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* BACKDROP ESCURO */}
        {usuarioParaExcluir && (
          <div className="modal-backdrop fade show"></div>
        )}

      </div>
    </DashboardLayout>
  );
}
