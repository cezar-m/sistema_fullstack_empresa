import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext"
import "../assets/css/styles-sidebar.css";

export default function Sidebar() {
	
	const { user } = useAuth();
	
	return(
		<div className="sidebar p-3" style={{ marginTop: "50px" }}>
			<h4>Sistema</h4>
			<Link to="/dashboard" className="sidebar-link">Dashboard</Link>
			<Link to="/estoque" className="sidebar-link">Estoque Produto</Link>
			<Link to="/produtos" className="sidebar-link">Produtos</Link>
			<Link to="/categorias" className="sidebar-link">Categoria</Link>
			<Link to="/vendas" className="sidebar-link">Vendas</Link>
			<Link to="/formas-pagamento" className="sidebar-link">Formas Pagamento</Link>
			<Link to="/pagamentos" className="sidebar-link">Pagamentos</Link>
		
			{user?.acesso === "admin" && (
				<Link to="/usuarios" className="sidebar-link">
					Usuários
				</Link>
			)}
		</div>
	);
}