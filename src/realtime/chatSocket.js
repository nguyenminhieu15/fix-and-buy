const jwt = require("jsonwebtoken");
const ChatConversation = require("../models/ChatConversation");
const { ensureConversation, appendMessage } = require("../routes/chatRoutes");

function serializeConversation(conversation) {
  return conversation && typeof conversation.toObject === "function" ? conversation.toObject() : conversation;
}

function registerChatSocket(io) {
  io.on("connection", (socket) => {
    socket.on("chat:customer:join", async (payload = {}, callback) => {
      try {
        const conversation = await ensureConversation(payload);
        socket.data.role = "customer";
        socket.data.conversationId = String(conversation._id);
        socket.join(`conversation:${conversation._id}`);
        await ChatConversation.findByIdAndUpdate(conversation._id, { customerOnline: true });
        io.to("admins").emit("chat:conversation:update", serializeConversation(conversation));
        callback?.({ ok: true, conversation: serializeConversation(conversation) });
      } catch (error) {
        callback?.({ ok: false, message: error.message });
      }
    });

    socket.on("chat:admin:join", async ({ token } = {}, callback) => {
      try {
        const decoded = jwt.verify(token || "", process.env.JWT_SECRET || "dev_secret_key");
        if (decoded.role !== "admin") throw new Error("Không có quyền admin.");
        socket.data.role = "admin";
        socket.join("admins");
        await ChatConversation.updateMany({}, { adminOnline: true });
        callback?.({ ok: true });
      } catch (error) {
        callback?.({ ok: false, message: "Token admin không hợp lệ." });
      }
    });

    socket.on("chat:admin:watch", ({ conversationId } = {}) => {
      if (socket.data.role !== "admin" || !conversationId) return;
      socket.join(`conversation:${conversationId}`);
    });

    socket.on("chat:message", async (payload = {}, callback) => {
      try {
        const sender = payload.sender === "admin" ? "admin" : "customer";
        if (sender === "admin" && socket.data.role !== "admin") {
          throw new Error("Bạn cần đăng nhập admin để gửi tin nhắn này.");
        }
        const conversationId = payload.conversationId || socket.data.conversationId;
        const result = await appendMessage({ conversationId, sender, body: payload.body });
        io.to(`conversation:${conversationId}`).emit("chat:message:new", result.message);
        io.to("admins").emit("chat:conversation:update", serializeConversation(result.conversation));
        callback?.({ ok: true, message: result.message, conversation: serializeConversation(result.conversation) });
      } catch (error) {
        callback?.({ ok: false, message: error.message });
      }
    });

    socket.on("disconnect", async () => {
      if (socket.data.role === "customer" && socket.data.conversationId) {
        await ChatConversation.findByIdAndUpdate(socket.data.conversationId, { customerOnline: false });
        io.to("admins").emit("chat:customer:left", { conversationId: socket.data.conversationId });
      }
    });
  });
}

module.exports = registerChatSocket;
