const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ["phone", "accessory", "service"], default: "phone" },
    brand: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    tier: { type: String, default: "midrange" },
    colorLabel: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    comparePrice: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    featured: { type: Boolean, default: false },
    bestseller: { type: Boolean, default: false },
    description: { type: String, default: "" },
    shortDescription: { type: String, default: "" },
    images: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    specs: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
