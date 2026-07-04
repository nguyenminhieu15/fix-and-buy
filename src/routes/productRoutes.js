const express = require("express");
const fs = require("fs");
const path = require("path");
const Product = require("../models/Product");
const Review = require("../models/Review");
const { testimonials } = require("../data/seedData");
const router = express.Router();

function defaultImageFor(product) {
  if (product?.type === "service") return "/assets/products/photos/thay-man-hinh-oled-cao-cap.jpg";
  if (product?.type === "accessory") return "/assets/products/photos/cu-sac-gan-65w-3-cong.jpg";
  return "/assets/products/photos/iphone-16-pro-max.jpg";
}

function localPhotoFor(product) {
  if (!product?.slug) return "";
  const relativeUrl = `/assets/products/photos/${product.slug}.jpg`;
  const localPath = path.join(__dirname, "../../public", relativeUrl);
  return fs.existsSync(localPath) ? relativeUrl : "";
}

function decorateProduct(productDoc) {
  const product = typeof productDoc?.toObject === "function" ? productDoc.toObject() : productDoc;
  if (!product) return product;
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const uploadedImages = images.filter((image) => image.startsWith("/uploads/") || image.includes("/uploads/") || /^https?:\/\//.test(image));
  const localPhoto = localPhotoFor(product);
  const imageList = uploadedImages.length
    ? [...uploadedImages, ...images.filter((image) => !uploadedImages.includes(image))]
    : [localPhoto || defaultImageFor(product), ...images];
  return {
    ...product,
    images: Array.from(new Set(imageList.filter(Boolean))),
  };
}

router.get("/meta/site", async (_req, res) => {
  const [productCount, phoneCount, accessoryCount, serviceCount] = await Promise.all([
    Product.countDocuments(),
    Product.countDocuments({ type: "phone" }),
    Product.countDocuments({ type: "accessory" }),
    Product.countDocuments({ type: "service" }),
  ]);

  res.json({
    counts: { productCount, phoneCount, accessoryCount, serviceCount },
    testimonials,
    brands: await Product.distinct("brand"),
    categories: await Product.distinct("category"),
  });
});

router.get("/", async (req, res) => {
  const {
    search = "",
    type,
    brand,
    category,
    featured,
    bestseller,
    sort = "featured",
    minPrice,
    maxPrice,
    limit,
    page = 1,
  } = req.query;

  const filter = {};
  if (type && type !== "all") filter.type = type;
  if (brand && brand !== "all") filter.brand = brand;
  if (category && category !== "all") filter.category = category;
  if (featured === "true") filter.featured = true;
  if (bestseller === "true") filter.bestseller = true;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (search.trim()) {
    filter.$or = [
      { name: { $regex: search.trim(), $options: "i" } },
      { brand: { $regex: search.trim(), $options: "i" } },
      { sku: { $regex: search.trim(), $options: "i" } },
      { tags: { $regex: search.trim(), $options: "i" } },
      { category: { $regex: search.trim(), $options: "i" } },
    ];
  }

  let sortBy = { featured: -1, createdAt: -1 };
  if (sort === "price_asc") sortBy = { price: 1 };
  if (sort === "price_desc") sortBy = { price: -1 };
  if (sort === "rating") sortBy = { rating: -1, reviewCount: -1 };
  if (sort === "newest") sortBy = { createdAt: -1 };
  if (sort === "name_asc") sortBy = { name: 1 };

  const perPage = Math.min(Number(limit) || 12, 100);
  const currentPage = Math.max(Number(page) || 1, 1);
  const skip = (currentPage - 1) * perPage;

  const [items, total] = await Promise.all([
    Product.find(filter).sort(sortBy).skip(skip).limit(perPage),
    Product.countDocuments(filter),
  ]);

  res.json({
    items: items.map(decorateProduct),
    pagination: {
      total,
      page: currentPage,
      pages: Math.ceil(total / perPage),
      limit: perPage,
    },
  });
});

router.get("/slug/:slug", async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug });
  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm." });

  const reviewStats = await Review.aggregate([
    { $match: { product: product._id, status: "approved" } },
    {
      $group: {
        _id: "$product",
        average: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const related = await Product.find({
    _id: { $ne: product._id },
    $or: [{ brand: product.brand }, { type: product.type }, { category: product.category }],
  })
    .sort({ featured: -1, rating: -1 })
    .limit(8);

  res.json({
    product: decorateProduct(product),
    ratingSummary: reviewStats[0] || { average: product.rating || 4.5, count: product.reviewCount || 0 },
    related: related.map(decorateProduct),
  });
});

router.get("/:id", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm." });
  res.json(decorateProduct(product));
});

module.exports = router;
