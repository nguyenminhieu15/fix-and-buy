const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();
const uploadDir = path.join(__dirname, "../../public/uploads/products");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const base = path
      .basename(file.originalname || "product", ext)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .toLowerCase()
      .slice(0, 60);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base || "product"}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpe?g|webp|gif|svg\+xml)$/i.test(file.mimetype)) return cb(null, true);
    return cb(new Error("Chỉ hỗ trợ file ảnh PNG, JPG, WEBP, GIF hoặc SVG."));
  },
});

router.post("/products", requireAdmin, upload.array("images", 8), (req, res) => {
  const files = (req.files || []).map((file) => ({
    filename: file.filename,
    url: `/uploads/products/${file.filename}`,
    size: file.size,
    mimetype: file.mimetype,
  }));
  res.status(201).json({ files });
});

router.use((error, _req, res, _next) => {
  res.status(400).json({ message: error.message || "Upload ảnh thất bại." });
});

module.exports = router;
