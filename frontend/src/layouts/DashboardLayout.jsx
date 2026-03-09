import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

export default function DashboardLayout({ children }) {
	return(
		<div className="d-flex min-vh-100">
			<Sidebar />
			
			<div className="flex-grow-1">
				<Navbar />
				
				<div className="flex-grow-1 p-4" style={{ marginTop: "60px" }}>
					{children}
				</div>
			</div>
		</div>
	);
}