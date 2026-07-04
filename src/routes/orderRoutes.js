const express = require("express");
const Product = require("../models/Product");
const Order = require("../models/Order");
const router = express.Router();

function getPaymentInstructions(orderCode, paymentMethod = "cod") {
  const content = `FIXBUY ${orderCode}`;
  const common = {
    content,
    note: "Thông tin thanh toán dùng để khách chuyển khoản và cửa hàng đối soát đơn hàng.",
  };

  if (paymentMethod === "bank_transfer") {
    return {
      ...common,
      type: "bank_transfer",
      bankName: "MB Bank",
      accountName: "FIX AND BUY SMARTPHONE",
      accountNumber: "0396351501",
      qrImage: "/assets/products/payment-qr-bank.svg",
    };
  }

  if (paymentMethod === "momo") {
    return {
      ...common,
      type: "momo",
      walletName: "MoMo",
      phoneNumber: "0396351501",
      qrImage: "/assets/products/payment-qr-bank.svg",
    };
  }

  return null;
}

function decorateOrder(orderDoc) {
  const order = typeof orderDoc.toObject === "function" ? orderDoc.toObject() : orderDoc;
  return {
    ...order,
    paymentInstructions: getPaymentInstructions(order.orderCode, order.paymentMethod),
  };
}

function buildCode(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function buildOrderTimeline() {
  return [
    { label: "Đã tạo đơn", status: "new", note: "Hệ thống đã ghi nhận đơn hàng.", time: new Date() },
  ];
}

router.post("/", async (req, res) => {
  const { customer, shippingAddress, items, paymentMethod = "cod", paymentMeta = {} } = req.body;

  if (!customer?.name || !customer?.email || !customer?.phone) {
    return res.status(400).json({ message: "Thiếu thông tin khách hàng." });
  }
  if (!shippingAddress?.city || !shippingAddress?.district || !shippingAddress?.ward || !shippingAddress?.addressLine) {
    return res.status(400).json({ message: "Thiếu địa chỉ giao hàng." });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Giỏ hàng đang trống." });
  }

  const ids = items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: ids } });
  const map = new Map(products.map((product) => [String(product._id), product]));

  const normalizedItems = [];
  let subtotal = 0;
  for (const item of items) {
    const product = map.get(String(item.productId));
    if (!product) {
      return res.status(400).json({ message: `Sản phẩm không tồn tại: ${item.productId}` });
    }
    const quantity = Math.max(Number(item.quantity) || 1, 1);
    if (product.type !== "service" && product.stock < quantity) {
      return res.status(400).json({ message: `${product.name} không đủ tồn kho.` });
    }
    normalizedItems.push({
      product: product._id,
      sku: product.sku,
      name: product.name,
      type: product.type,
      price: product.price,
      quantity,
      image: product.images?.[0] || "",
    });
    subtotal += product.price * quantity;
  }

  const shippingFee = subtotal > 1500000 ? 0 : 30000;
  const total = subtotal + shippingFee;
  const paymentStatus = paymentMethod === "cod" ? "pending" : "awaiting_confirmation";

  const order = await Order.create({
    orderCode: buildCode("ORD"),
    customer,
    shippingAddress,
    items: normalizedItems,
    subtotal,
    shippingFee,
    discount: 0,
    total,
    paymentMethod,
    paymentStatus,
    paymentMeta,
    orderStatus: "new",
    timeline: buildOrderTimeline(),
  });

  for (const item of normalizedItems) {
    if (item.type === "service") continue;
    await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
  }

  res.status(201).json({
    message: "Đặt hàng thành công.",
    orderCode: order.orderCode,
    paymentInstructions: getPaymentInstructions(order.orderCode, paymentMethod),
    order: decorateOrder(order),
  });
});

router.get("/tracking/:code", async (req, res) => {
  const order = await Order.findOne({ orderCode: req.params.code.toUpperCase() }).sort({ createdAt: -1 });
  if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
  res.json(decorateOrder(order));
});

router.get("/lookup/list", async (req, res) => {
  const { email, phone } = req.query;
  if (!email && !phone) {
    return res.status(400).json({ message: "Hãy nhập email hoặc số điện thoại để tra cứu." });
  }
  const filter = {};
  if (email) filter["customer.email"] = email.toLowerCase();
  if (phone) filter["customer.phone"] = phone;
  const items = await Order.find(filter).sort({ createdAt: -1 }).limit(20);
  res.json(items.map(decorateOrder));
});

module.exports = router;
