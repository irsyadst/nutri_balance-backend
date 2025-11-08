require("dotenv").config();
const express = require("express");
const path = require("path"); // Impor modul 'path'
const cors = require("cors");
const connectDB = require("./config/db");

// Impor rute-rute
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const foodRoutes = require("./routes/foodRoutes");
const adminRoutes = require("./routes/adminRoutes");
const statisticsRoutes = require("./routes/statisticsRoutes");

// Inisialisasi aplikasi Express
const app = express();

// Middleware for all routes
app.use(cors());
app.use(express.json());

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, "public")));

// Welcome page is the default landing page
app.get(["/", "/welcome", "/welcome.html"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "welcome.html"));
});

// Admin login routes
app.get(["/admin", "/admin.html", "/login", "/login.html"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Admin routes (should be accessed after login)
app.get(
  ["/dashboard", "/dashboard.html", "/manage-user", "/manage-user.html"],
  (req, res) => {
    const page = req.path.includes("manage-user")
      ? "manage-user.html"
      : "dashboard.html";
    res.sendFile(path.join(__dirname, "public", page));
  }
);

// Connect to Database
connectDB().catch((err) => {
  console.error("Warning: Database connection failed:", err.message);
  console.log("Continuing to serve static files...");
});

// API Routes (will only work after DB connection)
// More specific routes first
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/statistics", statisticsRoutes);
// General food routes last to prevent route conflicts
app.use("/api", foodRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
});
