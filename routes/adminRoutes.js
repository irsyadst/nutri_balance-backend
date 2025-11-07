const express = require('express');
const router = express.Router();

// [PERBAIKAN] Impor semua controller yang relevan
const { 
    adminLogin, 
    getAllUsers, 
    getAllLogs,
    getAllFoods,    // <-- TAMBAHAN BARU
    createFood,     // <-- TAMBAHAN BARU
    updateFood,     // <-- TAMBAHAN BARU
    deleteFood      // <-- TAMBAHAN BARU
} = require('../controllers/adminController');

const { authenticateToken, isAdmin } = require('../middlewares/authMiddleware');

// Rute Login
router.post('/login', adminLogin);

// Rute Manajemen User & Log
router.get('/users', authenticateToken, isAdmin, getAllUsers);
router.get('/logs', authenticateToken, isAdmin, getAllLogs);

// --- [TAMBAHAN BARU] Rute Manajemen Makanan ---
router.route('/foods')
    .get(authenticateToken, isAdmin, getAllFoods)    // GET /api/admin/foods
    .post(authenticateToken, isAdmin, createFood);   // POST /api/admin/foods

router.route('/foods/:id')
    .put(authenticateToken, isAdmin, updateFood)     // PUT /api/admin/foods/:id
    .delete(authenticateToken, isAdmin, deleteFood); // DELETE /api/admin/foods/:id
// --- [AKHIR TAMBAHAN] ---

module.exports = router;