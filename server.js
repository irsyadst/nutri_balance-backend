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

// Welcome page routes
app.get(["/welcome", "/welcome.html"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "welcome.html"));
});

// Admin login routes - support both /admin.html and /login.html
app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Admin dashboard routes
app.get(["/", "/dashboard", "/dashboard.html", "/index.html"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// Connect to Database
connectDB().catch((err) => {
  console.error("Warning: Database connection failed:", err.message);
  console.log("Continuing to serve static files...");
});

// API Routes (will only work after DB connection)
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api", foodRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/statistics", statisticsRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
});