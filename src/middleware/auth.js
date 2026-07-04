const jwt = require("jsonwebtoken");

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Thiếu token đăng nhập admin." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret_key");
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Bạn không có quyền truy cập tài nguyên này." });
    }
    req.admin = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn." });
  }
}

module.exports = { requireAdmin };
