const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Thiếu biến môi trường MONGODB_URI. Hãy tạo file .env từ .env.example");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log("MongoDB connected");
}

module.exports = connectDB;
