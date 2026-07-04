const express = require("express");
const Product = require("../models/Product");
const Review = require("../models/Review");
const router = express.Router();

router.get("/", async (req, res) => {
  const { productId, limit = 50 } = req.query;
  const filter = { status: "approved" };
  if (productId) filter.product = productId;
  const items = await Review.find(filter).sort({ createdAt: -1 }).limit(Math.min(Number(limit), 100));
  res.json(items);
});

router.post("/", async (req, res) => {
  const { productId, customerName, customerEmail, rating, title, comment } = req.body;
  if (!productId || !customerName || !rating || !comment) {
    return res.status(400).json({ message: "Vui lòng nhập đủ họ tên, số sao và nội dung đánh giá." });
  }

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: "Sản phẩm không tồn tại." });

  const review = await Review.create({
    product: product._id,
    customerName,
    customerEmail,
    rating: Number(rating),
    title: title || "",
    comment,
    status: "approved",
  });

  const stats = await Review.aggregate([
    { $match: { product: product._id, status: "approved" } },
    {
      $group: {
        _id: "$product",
        average: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats[0]) {
    product.rating = Number(stats[0].average.toFixed(1));
    product.reviewCount = stats[0].count;
    await product.save();
  }

  res.status(201).json({ message: "Đánh giá đã được ghi nhận.", review });
});

module.exports = router;
