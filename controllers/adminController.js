const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const User = require('../models/userModel');
const FoodLog = require('../models/foodLogModel');
const Food = require('../models/foodModel'); // Model Makanan

// --- FUNGSI LOGIN ADMIN ---
exports.adminLogin = async (req, res) => {
    // ... (Fungsi login Anda - tidak berubah)
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user && user.role === 'admin') {
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                const payload = { id: user._id, role: user.role };
                const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '3h' });
                res.json({ message: "Admin login berhasil", token: token });
            } else {
                res.status(401).json({ message: 'Email atau password salah.' });
            }
        } else {
            res.status(401).json({ message: 'Email atau password salah.' });
        }
    } catch (error) {
        console.error("Admin Login Error:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
};

// --- FUNGSI MANAJEMEN USER & LOG ---
exports.getAllUsers = async (req, res) => {
    // ... (Fungsi ini - tidak berubah)
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        console.error("Admin Get Users Error:", error);
        res.status(500).json({ message: 'Gagal mengambil data pengguna' });
    }
};

exports.getAllLogs = async (req, res) => {
    // ... (Fungsi ini - tidak berubah)
    try {
        const logs = await FoodLog.find({}).sort({ createdAt: -1 }).limit(50).populate('userId', 'name email');
        res.json(logs);
    } catch (error) {
        console.error("Admin Get Logs Error:", error);
        res.status(500).json({ message: 'Gagal mengambil data log' });
    }
};


// --- FUNGSI MANAJEMEN MAKANAN (DISESUAIKAN) ---

// Helper function untuk mengubah string "a, b, c" menjadi array ["a", "b", "c"]
const stringToArray = (str) => {
    if (!str || typeof str !== 'string') return [];
    return str.split(',').map(item => item.trim()).filter(item => item.length > 0);
};

exports.getAllFoods = async (req, res) => {
    // ... (Fungsi ini - tidak berubah)
    try {
        const foods = await Food.find({}).sort({ name: 1 });
        res.json(foods);
    } catch (error) {
        console.error("Admin Get Foods Error:", error);
        res.status(500).json({ message: 'Gagal mengambil data makanan' });
    }
};

exports.createFood = async (req, res) => {
    try {
        // [PERUBAHAN] Menyesuaikan field dengan model baru
        const { 
            name, category, calories, proteins, carbs, fats, 
            servingQuantity, servingUnit, dietaryTags, allergens 
        } = req.body;

        // Validasi disesuaikan
        if (!name || !category || !calories || !servingQuantity || !servingUnit) {
            return res.status(400).json({ message: 'Field wajib (name, category, calories, servingQuantity, servingUnit) tidak boleh kosong.' });
        }

        const newFood = new Food({
            name,
            category,
            calories,
            proteins: proteins || 0,
            carbs: carbs || 0,
            fats: fats || 0,
            servingQuantity, // [PERUBAHAN]
            servingUnit,   // [PERUBAHAN]
            dietaryTags: stringToArray(dietaryTags), // [PERUBAHAN]
            allergens: stringToArray(allergens)      // [PERUBAHAN]
        });

        const createdFood = await newFood.save();
        res.status(201).json(createdFood);
    } catch (error) {
        console.error("Admin Create Food Error:", error);
        res.status(500).json({ message: 'Gagal membuat data makanan' });
    }
};

exports.updateFood = async (req, res) => {
    try {
        const food = await Food.findById(req.params.id);

        if (food) {
            // [PERUBAHAN] Update field disesuaikan
            food.name = req.body.name || food.name;
            food.category = req.body.category || food.category;
            food.calories = req.body.calories || food.calories;
            food.proteins = req.body.proteins || food.proteins;
            food.carbs = req.body.carbs || food.carbs;
            food.fats = req.body.fats || food.fats;
            food.servingQuantity = req.body.servingQuantity || food.servingQuantity; // [PERUBAHAN]
            food.servingUnit = req.body.servingUnit || food.servingUnit;       // [PERUBAHAN]
            
            // Handle update untuk array
            food.dietaryTags = req.body.dietaryTags ? stringToArray(req.body.dietaryTags) : food.dietaryTags; // [PERUBAHAN]
            food.allergens = req.body.allergens ? stringToArray(req.body.allergens) : food.allergens;         // [PERUBAHAN]

            const updatedFood = await food.save();
            res.json(updatedFood);
        } else {
            res.status(404).json({ message: 'Data makanan tidak ditemukan' });
        }
    } catch (error) {
        console.error("Admin Update Food Error:", error);
        res.status(500).json({ message: 'Gagal memperbarui data makanan' });
    }
};

exports.deleteFood = async (req, res) => {
    // ... (Fungsi ini - tidak berubah)
    try {
        const food = await Food.findById(req.params.id);
        if (food) {
            await food.deleteOne();
            res.json({ message: 'Data makanan berhasil dihapus' });
        } else {
            res.status(404).json({ message: 'Data makanan tidak ditemukan' });
        }
    } catch (error) {
        console.error("Admin Delete Food Error:", error);
        res.status(500).json({ message: 'Gagal menghapus data makanan' });
    }
};