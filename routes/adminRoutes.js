const express = require("express");
const router = express.Router();

// [PERBAIKAN] Impor semua controller yang relevan
const {
  adminLogin,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getAllLogs,
  getAllFoods,
  createFood,
  updateFood,
  deleteFood,
} = require("../controllers/adminController");

const { authenticateToken, isAdmin } = require("../middlewares/authMiddleware");

// Rute Login
router.post("/login", adminLogin);

// Rute Manajemen User & Log
router.get("/users", authenticateToken, isAdmin, getAllUsers);
router.post("/users", authenticateToken, isAdmin, createUser);
router.put("/users/:id", authenticateToken, isAdmin, updateUser);
router.delete("/users/:id", authenticateToken, isAdmin, deleteUser);
router.get("/logs", authenticateToken, isAdmin, getAllLogs);

// --- [TAMBAHAN BARU] Rute Manajemen Makanan ---
router
  .route("/foods")
  .get(authenticateToken, isAdmin, getAllFoods) // GET /api/admin/foods
  .post(authenticateToken, isAdmin, createFood); // POST /api/admin/foods

router
  .route("/foods/:id")
  .put(authenticateToken, isAdmin, updateFood) // PUT /api/admin/foods/:id
  .delete(authenticateToken, isAdmin, deleteFood); // DELETE /api/admin/foods/:id
// --- [AKHIR TAMBAHAN] ---

module.exports = router;
