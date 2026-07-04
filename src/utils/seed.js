const Product = require("../models/Product");
const Review = require("../models/Review");
const Order = require("../models/Order");
const Booking = require("../models/Booking");
const { products, reviewTemplates, testimonials } = require("../data/seedData");

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildCode(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function buildTimeline(status) {
  const map = {
    new: [
      { label: "Đã tạo đơn", status: "new", note: "Đơn hàng đã được ghi nhận.", time: new Date() },
    ],
    confirmed: [
      { label: "Đã tạo đơn", status: "new", note: "Đơn hàng đã được ghi nhận.", time: new Date(Date.now() - 86400000) },
      { label: "Đã xác nhận", status: "confirmed", note: "Nhân viên đã gọi xác nhận đơn.", time: new Date() },
    ],
    shipping: [
      { label: "Đã tạo đơn", status: "new", note: "Đơn hàng đã được ghi nhận.", time: new Date(Date.now() - 2 * 86400000) },
      { label: "Đã xác nhận", status: "confirmed", note: "Kho bắt đầu chuẩn bị hàng.", time: new Date(Date.now() - 86400000) },
      { label: "Đang giao", status: "shipping", note: "Đơn hàng đang trên đường giao.", time: new Date() },
    ],
    completed: [
      { label: "Đã tạo đơn", status: "new", note: "Đơn hàng đã được ghi nhận.", time: new Date(Date.now() - 3 * 86400000) },
      { label: "Đã xác nhận", status: "confirmed", note: "Kho đã xác nhận và đóng gói.", time: new Date(Date.now() - 2 * 86400000) },
      { label: "Đang giao", status: "shipping", note: "Đơn hàng đã được bàn giao đối tác vận chuyển.", time: new Date(Date.now() - 86400000) },
      { label: "Hoàn tất", status: "completed", note: "Khách hàng đã nhận hàng.", time: new Date() },
    ],
  };
  return map[status] || map.new;
}

async function resetAndSeed() {
  await Promise.all([
    Product.deleteMany({}),
    Review.deleteMany({}),
    Order.deleteMany({}),
    Booking.deleteMany({}),
  ]);

  const insertedProducts = await Product.insertMany(products);

  const productMap = new Map(insertedProducts.map((item) => [item.slug, item]));
  const reviewDocs = reviewTemplates
    .filter((item) => productMap.has(item.productSlug))
    .map((item) => ({
      product: productMap.get(item.productSlug)._id,
      customerName: item.customerName,
      customerEmail: `${item.customerName.toLowerCase().replace(/\s+/g, ".")}@mail.com`,
      rating: item.rating,
      title: item.title,
      comment: item.comment,
      status: "approved",
    }));

  await Review.insertMany(reviewDocs);

  const phones = insertedProducts.filter((item) => item.type === "phone").slice(0, 16);
  const accessories = insertedProducts.filter((item) => item.type === "accessory").slice(0, 10);

  const demoOrders = Array.from({ length: 8 }).map((_, index) => {
    const first = randomPick(phones);
    const second = index % 2 === 0 ? randomPick(accessories) : randomPick(phones);
    const chosen = [first, second].filter(Boolean);
    const subtotal = chosen.reduce((sum, item) => sum + item.price, 0);
    const shippingFee = subtotal > 1500000 ? 0 : 30000;
    const orderStatus = randomPick(["new", "confirmed", "shipping", "completed"]);
    return {
      orderCode: buildCode("ORD"),
      customer: {
        name: randomPick(["Nguyễn Minh", "Lê Hương", "Trần Đạt", "Phạm Linh", "Đỗ Sơn", "Hoàng Nam"]),
        email: randomPick(["khach1@mail.com", "khach2@mail.com", "khach3@mail.com"]),
        phone: randomPick(["0901234567", "0912345678", "0988123456"]),
      },
      shippingAddress: {
        fullName: randomPick(["Nguyễn Minh", "Lê Hương", "Trần Đạt", "Phạm Linh"]),
        phone: randomPick(["0901234567", "0912345678", "0988123456"]),
        city: randomPick(["Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Cần Thơ"]),
        district: randomPick(["Quận 1", "Quận 3", "Bình Thạnh", "Cầu Giấy"]),
        ward: randomPick(["Phường 1", "Phường 5", "Phường 14", "Phường 22"]),
        addressLine: randomPick(["12 Nguyễn Trãi", "88 Lê Văn Sỹ", "120 Xô Viết Nghệ Tĩnh"]),
        note: "Giao giờ hành chính.",
      },
      items: chosen.map((item) => ({
        product: item._id,
        sku: item.sku,
        name: item.name,
        type: item.type,
        price: item.price,
        quantity: 1,
        image: item.images?.[0] || "",
      })),
      subtotal,
      shippingFee,
      discount: 0,
      total: subtotal + shippingFee,
      paymentMethod: randomPick(["cod", "bank_transfer", "momo"]),
      paymentStatus: randomPick(["pending", "awaiting_confirmation", "paid"]),
      orderStatus,
      timeline: buildTimeline(orderStatus),
      createdAt: new Date(Date.now() - index * 86400000),
      updatedAt: new Date(Date.now() - Math.max(0, index - 1) * 86400000),
    };
  });

  await Order.insertMany(demoOrders);

  const demoBookings = Array.from({ length: 8 }).map((_, index) => ({
    bookingCode: buildCode("BK"),
    customerName: randomPick(["Tuấn Anh", "Mai Phương", "Nhật Nam", "Yến Nhi", "Ngọc Châu"]),
    phone: randomPick(["0909000001", "0909000002", "0909000003"]),
    email: randomPick(["booking1@mail.com", "booking2@mail.com", "booking3@mail.com"]),
    address: randomPick(["35 Nguyễn Thị Minh Khai, Q1", "12 Phạm Văn Đồng, Thủ Đức", "220 Cầu Giấy, Hà Nội"]),
    brand: randomPick(["Apple", "Samsung", "Xiaomi", "OPPO"]),
    model: randomPick(["iPhone 15 Pro", "Galaxy S24 Ultra", "Redmi Note 13 Pro+", "Reno12 Pro 5G"]),
    issueType: randomPick(["Màn hình", "Pin", "Chân sạc", "Camera", "Loa/Mic"]),
    issueDetail: randomPick([
      "Máy bị sọc màn sau khi rơi.",
      "Pin tụt nhanh, nóng máy khi sạc.",
      "Chân sạc lỏng, sạc chập chờn.",
      "Camera sau bị mờ và rung.",
    ]),
    appointmentDate: new Date(Date.now() + index * 86400000).toISOString().slice(0, 10),
    preferredTime: randomPick(["09:00", "11:00", "14:30", "18:00"]),
    estimatedBudget: randomPick([0, 500000, 800000, 1200000]),
    status: randomPick(["pending", "inspecting", "fixing", "ready", "completed"]),
    note: "Khách yêu cầu kiểm tra kỹ trước khi báo giá.",
  }));

  await Booking.insertMany(demoBookings);

  return {
    products: insertedProducts.length,
    reviews: reviewDocs.length,
    orders: demoOrders.length,
    bookings: demoBookings.length,
    testimonials,
  };
}

async function seedIfEmpty() {
  const count = await Product.countDocuments();
  if (count === 0) {
    await resetAndSeed();
    console.log("Seeded product data");
  }
}

module.exports = { resetAndSeed, seedIfEmpty };
