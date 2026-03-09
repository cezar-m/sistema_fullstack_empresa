import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	
	const handleLogout = () => {
		logout(); // limpa usuário
		navigate("/")
	};
	
	return(
		<div className="navbar navbar-light bg-light fixed-top px-3 d-flex justify-content-between">
			<span>Olá {user?.nome}</span>
			<button className="btn btn-danger" onClick={handleLogout}>Deslogar</button>
		</div>
	);
}