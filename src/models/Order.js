const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    sku: String,
    name: String,
    type: String,
    price: Number,
    quantity: { type: Number, default: 1, min: 1 },
    image: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderCode: { type: String, required: true, unique: true, index: true },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true },
      phone: { type: String, required: true },
    },
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      city: { type: String, required: true },
      district: { type: String, required: true },
      ward: { type: String, required: true },
      addressLine: { type: String, required: true },
      note: { type: String, default: "" },
    },
    items: { type: [orderItemSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ["cod", "bank_transfer", "momo"],
      default: "cod",
    },
    paymentMeta: {
      transferNote: { type: String, default: "" },
      payerName: { type: String, default: "" },
      proofUrl: { type: String, default: "" },
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "awaiting_confirmation", "refunded"],
      default: "pending",
    },
    orderStatus: {
      type: String,
      enum: ["new", "confirmed", "processing", "shipping", "completed", "cancelled"],
      default: "new",
    },
    timeline: {
      type: [
        {
          label: String,
          status: String,
          note: String,
          time: Date,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
