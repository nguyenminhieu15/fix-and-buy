const mongoose = require("mongoose");

const chatConversationSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    customerName: { type: String, default: "Khách đang xem web", trim: true },
    customerEmail: { type: String, default: "", trim: true },
    customerPhone: { type: String, default: "", trim: true },
    status: { type: String, enum: ["open", "waiting", "closed"], default: "open" },
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: Date.now },
    unreadAdmin: { type: Number, default: 0, min: 0 },
    unreadCustomer: { type: Number, default: 0, min: 0 },
    customerOnline: { type: Boolean, default: false },
    adminOnline: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatConversation", chatConversationSchema);
