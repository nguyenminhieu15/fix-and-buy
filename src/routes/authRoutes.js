const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();

router.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;
  const adminEmail = process.env.ADMIN_EMAIL || "admin@fixbuy.vn";
  const adminPassword = process.env.ADMIN_PASSWORD || "12345678";

  if (!email || !password) {
    return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu admin." });
  }

  const emailMatched = email.trim().toLowerCase() === adminEmail.trim().toLowerCase();
  const passwordMatched =
    password === adminPassword ||
    (adminPassword.startsWith("$2") && (await bcrypt.compare(password, adminPassword)));

  if (!emailMatched || !passwordMatched) {
    return res.status(401).json({ message: "Sai thông tin đăng nhập admin." });
  }

  const token = jwt.sign(
    { role: "admin", email: adminEmail },
    process.env.JWT_SECRET || "dev_secret_key",
    { expiresIn: "12h" }
  );

  res.json({
    message: "Đăng nhập admin thành công.",
    token,
    admin: { email: adminEmail, role: "admin" },
  });
});

module.exports = router;
