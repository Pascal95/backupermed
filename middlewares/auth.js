const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).json({ error: "No token provided" });
  
    jwt.verify(token, process.env.AUTH_TOKEN, (err, user) => {
      if (err) return res.status(403).json({ error: "Token is invalid or expired" });
      req.user = user;
      next();
    });
}
  
module.exports = { authenticateToken };