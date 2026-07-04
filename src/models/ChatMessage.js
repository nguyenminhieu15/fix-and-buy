const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "ChatConversation", required: true, index: true },
    sender: { type: String, enum: ["customer", "admin", "system"], required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    readByAdmin: { type: Boolean, default: false },
    readByCustomer: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
