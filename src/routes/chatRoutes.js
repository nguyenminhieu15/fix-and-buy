const express = require("express");
const ChatConversation = require("../models/ChatConversation");
const ChatMessage = require("../models/ChatMessage");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

async function ensureConversation(payload = {}) {
  const sessionId = String(payload.sessionId || "").trim();
  if (!sessionId) {
    const error = new Error("Thiếu session chat.");
    error.statusCode = 400;
    throw error;
  }

  const update = {
    customerName: payload.customerName || payload.name || "Khách đang xem web",
    customerEmail: payload.customerEmail || payload.email || "",
    customerPhone: payload.customerPhone || payload.phone || "",
    status: "open",
    lastMessageAt: new Date(),
  };

  return ChatConversation.findOneAndUpdate(
    { sessionId },
    { $setOnInsert: { sessionId }, $set: update },
    { upsert: true, new: true }
  );
}

async function appendMessage({ conversationId, sender, body }) {
  const text = String(body || "").trim();
  if (!text) {
    const error = new Error("Tin nhắn không được để trống.");
    error.statusCode = 400;
    throw error;
  }

  const conversation = await ChatConversation.findById(conversationId);
  if (!conversation) {
    const error = new Error("Không tìm thấy cuộc trò chuyện.");
    error.statusCode = 404;
    throw error;
  }

  const message = await ChatMessage.create({
    conversation: conversation._id,
    sender,
    body: text,
    readByAdmin: sender === "admin",
    readByCustomer: sender === "customer",
  });

  conversation.lastMessage = text;
  conversation.lastMessageAt = new Date();
  conversation.status = "open";
  if (sender === "customer") conversation.unreadAdmin += 1;
  if (sender === "admin") conversation.unreadCustomer += 1;
  await conversation.save();

  return { conversation, message };
}

router.post("/conversations", async (req, res, next) => {
  try {
    const conversation = await ensureConversation(req.body);
    res.status(201).json(conversation);
  } catch (error) {
    next(error);
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  const items = await ChatMessage.find({ conversation: req.params.id }).sort({ createdAt: 1 }).limit(300);
  res.json(items);
});

router.post("/conversations/:id/messages", async (req, res, next) => {
  try {
    const result = await appendMessage({
      conversationId: req.params.id,
      sender: "customer",
      body: req.body.body,
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/admin/conversations", requireAdmin, async (_req, res) => {
  const items = await ChatConversation.find().sort({ lastMessageAt: -1, updatedAt: -1 }).limit(200);
  res.json(items);
});

router.get("/admin/conversations/:id/messages", requireAdmin, async (req, res) => {
  await ChatConversation.findByIdAndUpdate(req.params.id, { unreadAdmin: 0 });
  const items = await ChatMessage.find({ conversation: req.params.id }).sort({ createdAt: 1 }).limit(500);
  res.json(items);
});

router.post("/admin/conversations/:id/messages", requireAdmin, async (req, res, next) => {
  try {
    const result = await appendMessage({
      conversationId: req.params.id,
      sender: "admin",
      body: req.body.body,
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.patch("/admin/conversations/:id", requireAdmin, async (req, res) => {
  const conversation = await ChatConversation.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status || "open", unreadAdmin: 0 },
    { new: true }
  );
  if (!conversation) return res.status(404).json({ message: "Không tìm thấy cuộc trò chuyện." });
  res.json(conversation);
});

router.use((error, _req, res, _next) => {
  res.status(error.statusCode || 500).json({ message: error.message || "Lỗi chat." });
});

module.exports = { router, ensureConversation, appendMessage };
