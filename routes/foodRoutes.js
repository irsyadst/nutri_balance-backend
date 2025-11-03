const express = require('express');
const router = express.Router();
const {
    getFoodCategories, // <-- Fungsinya sudah di-impor
    searchFoods,
    logFood,
    getHistory,

    getMealPlan,
    generateMealPlan
} = require('../controllers/foodController');
const { protect } = require('../middlewares/authMiddleware');

// --- Rute yang berhubungan dengan Makanan ---

// GET /api/food/search -> Mencari makanan
router.get('/search', protect, searchFoods);

// --- PERBAIKAN DI SINI ---
// GET /api/food/categories -> Mengambil semua kategori unik
router.get('/categories', protect, getFoodCategories); // <-- TAMBAHKAN BARIS INI
// --- AKHIR PERBAIKAN ---

// POST /api/food/log -> Mencatat makanan harian
router.post('/log', protect, logFood);

// GET /api/food/log/history -> Mengambil riwayat log
router.get('/log/history', protect, getHistory);

// --- Rute yang berhubungan dengan Rencana Makan (Meal Plan) ---

// GET /api/food/meal-plan -> Mengambil meal plan HARI INI (atau tanggal tertentu)
router.get('/meal-plan', protect, getMealPlan);

// POST /api/food/generate-meal-plan -> Membuat meal plan baru
router.post('/generate-meal-plan', protect, generateMealPlan);

module.exports = router;