const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    customerName: { type: String, required: true, trim: true },
    customerEmail: { type: String, default: "", trim: true, lowercase: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: "" },
    comment: { type: String, required: true, trim: true },
    status: { type: String, enum: ["approved", "hidden"], default: "approved" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
