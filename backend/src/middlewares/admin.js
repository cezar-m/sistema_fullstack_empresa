export default function(req, res, next) {
	if(req.user.acesso !== "admin")
		return res.status(403).json({erro:"somente admin"});
	next();
}