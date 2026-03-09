import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../layouts/DashboardLayout";

export default function Dashboard() {
		
	const { user } = useAuth();
	
	console.log(user);
	
	return (
		<DashboardLayout>
			<div className="container mt-4">
				<div className="card p-4 shodow">
					<h3>Dashboard</h3>
					
					<h5>
						Bem vindo, {user?.nome || "Usuários"}
					</h5>
					
					<p>Sistema administrativo</p>
				</div>
			</div>
		</DashboardLayout>
	);
}