import jwt from "jsonwebtoken";

export default function auth(req, res, next) {
  // Pega o token do header
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ erro: "Sem token" });

  // Suporta tanto "Bearer <token>" quanto apenas "<token>"
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;

  if (!token) return res.status(401).json({ erro: "Sem token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // VERIFICAR se o payload realmente tem id
    if (!decoded.id) {
      console.error("Token inválido: payload sem id", decoded);
      return res.status(401).json({ erro: "Token inválido" });
    }

    req.user = decoded; // ex: { id: 1, nome: "Cezar" }
    next();
  } catch (err) {
    console.error("Token inválido:", err.message || err);
    return res.status(401).json({ erro: "Token inválido" });
  }
}
