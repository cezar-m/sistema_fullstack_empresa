import { BrowserRouter, Routes, Route } from "react-router-dom";  
import Login from "./pages/auth/Login";
import Dashboard from "./pages/Dashboard";
import Register from "./pages/auth/Register";
import EsqueciSenha from "./pages/auth/EsqueciSenha";
import ResetSenha from "./pages/auth/ResetSenha";
import EstoqueProduto from "./pages/EstoqueProduto";
import Produtos from "./pages/Produtos";
import Categorias from "./pages/Categorias";
import Vendas from "./pages/Vendas";
import FormasPagamento from "./pages/FormasPagamento";
import Pagamentos from "./pages/Pagamentos";
import Usuarios from "./pages/Usuarios";
import PrivateRoute from "./components/PrivateRoute"; 
import "./assets/css/styles-login.css";

export default function App() {
	
	return (
		<BrowserRouter>
			<Routes>
				
				<Route path="/" element={<Login />} />
				<Route path="/register" element={<Register />} />
				<Route path="/esqueci-senha" element={<EsqueciSenha />} />
				<Route path="/redefinir-senha/:token" element={ <ResetSenha /> } />
				
				<Route path="/dashboard" element={
					<PrivateRoute>
						<Dashboard />
					</PrivateRoute>
				} />
				
				<Route path="/produtos" element={
					<PrivateRoute>
						<Produtos />
					</PrivateRoute>
				} />
				
				<Route path="/estoque" element={
					<PrivateRoute>
						<EstoqueProduto />
					</PrivateRoute>
				} />
				
				<Route path="/categorias" element={
					<PrivateRoute>
						<Categorias />
					</PrivateRoute>
				} />
				
				<Route path="/vendas" element={
					<PrivateRoute>
						<Vendas />
					</PrivateRoute>
				} />
				
				<Route path="/formas-pagamento" element={
					<PrivateRoute>
						<FormasPagamento />
					</PrivateRoute>
				} />
				
				<Route path="/pagamentos" element={
					<PrivateRoute>
						<Pagamentos />
					</PrivateRoute>
				} />
				
				<Route path="/usuarios" element={
					<PrivateRoute>
						<Usuarios />
					</PrivateRoute>
				} />
				
			</Routes>
		</BrowserRouter>
	)
}