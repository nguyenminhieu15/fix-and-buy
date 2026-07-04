const express = require("express");
const Booking = require("../models/Booking");
const router = express.Router();

function buildCode(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

router.post("/", async (req, res) => {
  const {
    customerName,
    phone,
    email = "",
    address = "",
    brand,
    model,
    issueType,
    issueDetail = "",
    appointmentDate,
    preferredTime = "",
    estimatedBudget = 0,
  } = req.body;

  if (!customerName || !phone || !brand || !model || !issueType || !appointmentDate) {
    return res.status(400).json({ message: "Vui lòng nhập đủ thông tin đặt lịch sửa chữa." });
  }

  const booking = await Booking.create({
    bookingCode: buildCode("BK"),
    customerName,
    phone,
    email,
    address,
    brand,
    model,
    issueType,
    issueDetail,
    appointmentDate,
    preferredTime,
    estimatedBudget: Number(estimatedBudget) || 0,
    status: "pending",
    note: "Đã tiếp nhận yêu cầu từ website.",
  });

  res.status(201).json({
    message: "Đặt lịch sửa thành công.",
    bookingCode: booking.bookingCode,
    booking,
  });
});

router.get("/tracking/:code", async (req, res) => {
  const booking = await Booking.findOne({ bookingCode: req.params.code.toUpperCase() });
  if (!booking) return res.status(404).json({ message: "Không tìm thấy phiếu sửa chữa." });
  res.json(booking);
});

module.exports = router;
