import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/api";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
	
	const [user, setUser] = useState(null);
	
	/* carregar usuário ao iniciar */
	useEffect(() => {
		
		const token = localStorage.getItem("token");
		
		if(token) {
			try {
				const decoded = jwtDecode(token);
				setUser(decoded);
			} catch(err) {
				console.log("Token inválido");
				localStorage.removeItem("token");
			}
		}
	}, []);
	
	/* LOGIN */
	const login = async (email, senha) => {
		
		const { data } = await api.post("/auth/login", {
			email,
			senha
		});
		
		localStorage.setItem("token", data.token);
		
		const decoded = jwtDecode(data.token);
		setUser(decoded);
	};
	
	/* LOGOUT */
	const logout = () => {
		localStorage.removeItem("token");
		setUser(null);
	};
	
	return (
		<AuthContext.Provider value={{ user, login, logout }}>
			{children}
		</AuthContext.Provider>
	);
};

/* PROTEGER HOOK */
export const useAuth = () => {
	
	const context = useContext(AuthContext);
	
	if(!context) {
		throw new Error("useAuth preisa estar dentro do AuthProvider");
	}
	
	return context;
};