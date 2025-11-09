require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const foodRoutes = require("./routes/foodRoutes");
const adminRoutes = require("./routes/adminRoutes");
const statisticsRoutes = require("./routes/statisticsRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.get(["/", "/welcome", "/welcome.html"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "welcome.html"));
});

app.get(["/admin", "/admin.html", "/login", "/login.html"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get(
  ["/dashboard", "/dashboard.html", "/manage-user", "/manage-user.html"],
  (req, res) => {
    const page = req.path.includes("manage-user")
      ? "manage-user.html"
      : "dashboard.html";
    res.sendFile(path.join(__dirname, "public", page));
  }
);

connectDB().catch((err) => {
  console.error("Warning: Database connection failed:", err.message);
  console.log("Continuing to serve static files...");
});

app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/statistics", statisticsRoutes);
app.use("/api", foodRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
});
