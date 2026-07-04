const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db");
const productRoutes = require("./src/routes/productRoutes");
const reviewRoutes = require("./src/routes/reviewRoutes");
const orderRoutes = require("./src/routes/orderRoutes");
const bookingRoutes = require("./src/routes/bookingRoutes");
const authRoutes = require("./src/routes/authRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const { router: chatRoutes } = require("./src/routes/chatRoutes");
const uploadRoutes = require("./src/routes/uploadRoutes");
const registerChatSocket = require("./src/realtime/chatSocket");
const { seedIfEmpty } = require("./src/utils/seed");

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin/uploads", uploadRoutes);
app.use("/api/admin", adminRoutes);

registerChatSocket(io);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    message: "Fix and Buy Smartphone API is running",
    time: new Date().toISOString(),
  });
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("*", (req, res) => {
  // fallback to static files or home page
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ message: "API route not found" });
  }
  return res.sendFile(path.join(__dirname, "public", "index.html"));
});

async function start() {
  try {
    await connectDB();
    await seedIfEmpty();
    server.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Cannot start server:", error);
    process.exit(1);
  }
}

start();
