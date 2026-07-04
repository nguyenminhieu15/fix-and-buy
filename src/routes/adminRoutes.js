const express = require("express");
const fs = require("fs");
const path = require("path");
const Product = require("../models/Product");
const Review = require("../models/Review");
const Order = require("../models/Order");
const Booking = require("../models/Booking");
const { requireAdmin } = require("../middleware/auth");
const { resetAndSeed } = require("../utils/seed");

const router = express.Router();

router.use(requireAdmin);

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

router.get("/dashboard", async (_req, res) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setHours(0, 0, 0, 0);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const [
    products,
    orders,
    bookings,
    reviews,
    lowStockProducts,
    latestOrders,
    latestBookings,
    paymentPendingOrders,
    latestReviews,
    revenueAgg,
    avgRatingAgg,
    orderStatusAgg,
    paymentStatusAgg,
    bookingStatusAgg,
    revenueTrendAgg,
    inventoryMixAgg,
  ] = await Promise.all([
    Product.countDocuments(),
    Order.countDocuments(),
    Booking.countDocuments(),
    Review.countDocuments(),
    Product.find({ type: { $ne: "service" }, stock: { $lte: 10 } }).sort({ stock: 1 }).limit(8),
    Order.find().sort({ createdAt: -1 }).limit(8),
    Booking.find().sort({ createdAt: -1 }).limit(8),
    Order.find({ paymentMethod: { $in: ["bank_transfer", "momo"] }, paymentStatus: "awaiting_confirmation" }).sort({ createdAt: -1 }).limit(8),
    Review.find().populate("product", "name").sort({ createdAt: -1 }).limit(8),
    Order.aggregate([
      { $match: { orderStatus: { $in: ["confirmed", "shipping", "completed"] } } },
      { $group: { _id: null, totalRevenue: { $sum: "$total" } } },
    ]),
    Review.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: null, averageRating: { $avg: "$rating" } } },
    ]),
    Order.aggregate([{ $group: { _id: "$orderStatus", count: { $sum: 1 } } }]),
    Order.aggregate([{ $group: { _id: "$paymentStatus", count: { $sum: 1 } } }]),
    Booking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, orderStatus: { $in: ["confirmed", "shipping", "completed"] } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          revenue: { $sum: "$total" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]),
    Product.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }]),
  ]);

  const orderStatusMap = Object.fromEntries(orderStatusAgg.map((item) => [item._id, item.count]));
  const paymentStatusMap = Object.fromEntries(paymentStatusAgg.map((item) => [item._id, item.count]));
  const bookingStatusMap = Object.fromEntries(bookingStatusAgg.map((item) => [item._id, item.count]));
  const inventoryMix = Object.fromEntries(inventoryMixAgg.map((item) => [item._id, item.count]));
  const revenueMap = new Map(
    revenueTrendAgg.map((item) => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(item._id.day).padStart(2, "0")}`;
      return [key, item.revenue];
    })
  );

  const revenueTrend = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(sevenDaysAgo);
    date.setDate(sevenDaysAgo.getDate() + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return {
      label: `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`,
      value: revenueMap.get(key) || 0,
    };
  });

  res.json({
    stats: {
      products,
      orders,
      bookings,
      reviews,
      revenue: revenueAgg[0]?.totalRevenue || 0,
      avgRating: Number((avgRatingAgg[0]?.averageRating || 0).toFixed(1)),
      pendingOrders: orderStatusMap.new || 0,
      processingOrders: (orderStatusMap.confirmed || 0) + (orderStatusMap.processing || 0) + (orderStatusMap.shipping || 0),
      awaitingPayments: paymentStatusMap.awaiting_confirmation || 0,
      paidOrders: paymentStatusMap.paid || 0,
      readyBookings: bookingStatusMap.ready || 0,
      fixingBookings: bookingStatusMap.fixing || 0,
      inventoryMix: {
        phone: inventoryMix.phone || 0,
        accessory: inventoryMix.accessory || 0,
        service: inventoryMix.service || 0,
      },
    },
    revenueTrend,
    lowStockProducts: lowStockProducts.map(decorateProduct),
    latestOrders,
    latestBookings,
    paymentPendingOrders,
    latestReviews,
  });
});

router.get("/products", async (req, res) => {
  const { search = "", type = "all", brand = "all" } = req.query;
  const filter = {};
  if (type !== "all") filter.type = type;
  if (brand !== "all") filter.brand = brand;
  if (search.trim()) {
    filter.$or = [
      { name: { $regex: search.trim(), $options: "i" } },
      { sku: { $regex: search.trim(), $options: "i" } },
      { brand: { $regex: search.trim(), $options: "i" } },
    ];
  }
  const items = await Product.find(filter).sort({ createdAt: -1 }).limit(500);
  res.json(items.map(decorateProduct));
});

router.post("/products", async (req, res) => {
  const payload = req.body || {};
  if (!payload.name || !payload.slug || !payload.sku) {
    return res.status(400).json({ message: "Thiếu tên, slug hoặc SKU." });
  }
  const exists = await Product.findOne({ $or: [{ slug: payload.slug }, { sku: payload.sku }] });
  if (exists) {
    return res.status(400).json({ message: "Slug hoặc SKU đã tồn tại." });
  }
  const product = await Product.create(payload);
  res.status(201).json({ message: "Đã thêm sản phẩm.", product: decorateProduct(product) });
});

router.put("/products/:id", async (req, res) => {
  const payload = req.body || {};
  const current = await Product.findById(req.params.id);
  if (!current) return res.status(404).json({ message: "Không tìm thấy sản phẩm." });

  const duplicated = await Product.findOne({
    _id: { $ne: current._id },
    $or: [{ slug: payload.slug }, { sku: payload.sku }],
  });
  if (duplicated) {
    return res.status(400).json({ message: "Slug hoặc SKU đang bị trùng." });
  }

  Object.assign(current, payload);
  await current.save();
  res.json({ message: "Đã cập nhật sản phẩm.", product: decorateProduct(current) });
});

router.delete("/products/:id", async (req, res) => {
  const current = await Product.findById(req.params.id);
  if (!current) return res.status(404).json({ message: "Không tìm thấy sản phẩm." });
  await current.deleteOne();
  await Review.deleteMany({ product: current._id });
  res.json({ message: "Đã xóa sản phẩm và đánh giá liên quan." });
});

router.get("/orders", async (_req, res) => {
  const items = await Order.find().sort({ createdAt: -1 }).limit(200);
  res.json(items);
});

router.patch("/orders/:id", async (req, res) => {
  const { orderStatus, paymentStatus, note } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng." });

  if (orderStatus) {
    order.orderStatus = orderStatus;
    order.timeline.push({
      label: "Cập nhật trạng thái",
      status: orderStatus,
      note: note || `Admin cập nhật đơn sang trạng thái: ${orderStatus}`,
      time: new Date(),
    });
  }
  if (paymentStatus) {
    order.paymentStatus = paymentStatus;
  }

  await order.save();
  res.json({ message: "Đã cập nhật đơn hàng.", order });
});

router.get("/bookings", async (_req, res) => {
  const items = await Booking.find().sort({ createdAt: -1 }).limit(200);
  res.json(items);
});

router.patch("/bookings/:id", async (req, res) => {
  const { status, note } = req.body;
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Không tìm thấy phiếu sửa." });
  if (status) booking.status = status;
  if (note !== undefined) booking.note = note;
  await booking.save();
  res.json({ message: "Đã cập nhật phiếu sửa.", booking });
});

router.get("/reviews", async (_req, res) => {
  const items = await Review.find().populate("product", "name slug brand").sort({ createdAt: -1 }).limit(300);
  res.json(items);
});

router.patch("/reviews/:id", async (req, res) => {
  const { status } = req.body;
  const review = await Review.findById(req.params.id);
  if (!review) return res.status(404).json({ message: "Không tìm thấy đánh giá." });
  review.status = status || review.status;
  await review.save();

  const stats = await Review.aggregate([
    { $match: { product: review.product, status: "approved" } },
    {
      $group: {
        _id: "$product",
        average: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  await Product.findByIdAndUpdate(review.product, {
    rating: stats[0] ? Number(stats[0].average.toFixed(1)) : 0,
    reviewCount: stats[0] ? stats[0].count : 0,
  });

  res.json({ message: "Đã cập nhật trạng thái đánh giá.", review });
});

router.get("/export", async (_req, res) => {
  const [products, orders, bookings, reviews] = await Promise.all([
    Product.find().lean(),
    Order.find().lean(),
    Booking.find().lean(),
    Review.find().lean(),
  ]);
  res.json({
    exportedAt: new Date().toISOString(),
    products,
    orders,
    bookings,
    reviews,
  });
});

router.post("/reset-demo", async (_req, res) => {
  const result = await resetAndSeed();
  res.json({ message: "Đã khôi phục dữ liệu.", result });
});

module.exports = router;
