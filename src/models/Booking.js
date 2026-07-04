const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: { type: String, required: true, unique: true, index: true },
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    address: { type: String, default: "" },
    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    issueType: { type: String, required: true, trim: true },
    issueDetail: { type: String, default: "" },
    appointmentDate: { type: String, required: true },
    preferredTime: { type: String, default: "" },
    estimatedBudget: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "inspecting", "fixing", "ready", "completed", "cancelled"],
      default: "pending",
    },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
