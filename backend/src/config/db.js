import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

export default mysql.createPool({
	host: "localhost",
	user: "root",
	password: "",
	database: "sistema_admin_empresa",
	port: 3306  
});