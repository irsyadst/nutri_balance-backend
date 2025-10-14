// 1. Impor Dependensi
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// 2. Pengaturan Awal
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;

// 3. Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 4. Koneksi ke Database
if (!MONGO_URI) {
    console.error('❌ FATAL ERROR: MONGO_URI tidak ditemukan di environment variables.');
    process.exit(1);
}
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Database MongoDB berhasil tersambung'))
    .catch(err => console.error('❌ Kesalahan koneksi database:', err));

// 5. Skema & Model Mongoose
// Skema profil yang diperluas sesuai kuesioner 16 langkah
const UserProfileSchema = new mongoose.Schema({
    // Step 1-5
    gender: String,
    age: Number,
    height: Number,
    currentWeight: Number,
    goalWeight: Number,
    // Step 6-9
    wakeUpTime: String,
    sleepTime: String,
    firstMealTime: String,
    lastMealTime: String,
    // Step 10-16
    dailyMealIntake: String, // e.g., "3", "4", "5+"
    climate: String, // "Panas", "Berawan", "Dingin"
    waterIntake: String, // "sekitar 2 gelas", etc.
    activityLevel: String, // "Menetap", "Aktivitas Ringan", etc.
    goals: [String], // ["Penurunan berat badan", "Peningkatan tingkat energi"]
    fastingExperience: String, // "Tidak, ini pertama saya", etc.
    healthIssues: [String], // ["Diabetes", "Tekanan darah tinggi"]
    // Data yang dihitung
    targetCalories: Number,
    targetProteins: Number,
    targetCarbs: Number,
    targetFats: Number,
});

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    profile: UserProfileSchema,
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

const FoodLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // Format YYYY-MM-DD
    food: {
        id: String, name: String, calories: Number,
        proteins: Number, carbs: Number, fats: Number, category: String,
    },
    quantity: { type: Number, required: true },
    mealType: { type: String, required: true }, // e.g., "Sarapan"
}, { timestamps: true });

const FoodLog = mongoose.model('FoodLog', FoodLogSchema);

// Skema untuk Meal Planner
const MealPlanSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // Format YYYY-MM-DD
    mealType: { type: String, required: true }, // e.g., "Sarapan"
    food: { type: Object, required: true },
    time: String, // e.g., "07:00am"
});

const MealPlan = mongoose.model('MealPlan', MealPlanSchema);

// Database makanan statis dengan kategori
const foodDatabase = [
    { id: '1', name: 'Nasi Putih (100g)', calories: 130, proteins: 3, carbs: 28, fats: 0, category: 'Lainnya' },
    { id: '2', name: 'Dada Ayam Bakar (100g)', calories: 165, proteins: 31, carbs: 0, fats: 4, category: 'Daging' },
    { id: '3', name: 'Telur Rebus (1 butir)', calories: 78, proteins: 6, carbs: 1, fats: 5, category: 'Lainnya' },
    { id: '4', name: 'Salad Sayur', calories: 50, proteins: 2, carbs: 10, fats: 1, category: 'Salad' },
    { id: '5', name: 'Honey Pancake', calories: 180, proteins: 5, carbs: 30, fats: 4, category: 'Kue' },
    { id: '6', name: 'Blueberry Pancake', calories: 230, proteins: 6, carbs: 40, fats: 5, category: 'Kue' },
    { id: '7', name: 'Apple Pie', calories: 250, proteins: 3, carbs: 35, fats: 12, category: 'Pie' },
    { id: '8', name: 'Banana Smoothie', calories: 150, proteins: 4, carbs: 25, fats: 3, category: 'Smoothie' },
];

const foodCategories = ['Salad', 'Kue', 'Pie', 'Smoothie', 'Daging', 'Lainnya'];

// 6. Fungsi Bantuan & Middleware (Tidak banyak berubah)
const calculateNeeds = (profile) => { /* ... (kode sama persis seperti sebelumnya) ... */ };
const authenticateToken = (req, res, next) => { /* ... (kode sama persis seperti sebelumnya) ... */ };


// 7. Rute API (API Routes)

// == Rute Autentikasi ==
app.post('/api/auth/register', async (req, res) => { /* ... (kode sama) ... */ });
app.post('/api/auth/login', async (req, res) => { /* ... (kode sama) ... */ });

// == Rute Pengguna ==
app.get('/api/user/profile', authenticateToken, async (req, res) => { /* ... (kode sama) ... */ });
app.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: "Pengguna tidak ditemukan" });
        
        // Sekarang menerima objek profil yang jauh lebih besar
        user.profile = req.body;
        // Hitung ulang kebutuhan kalori berdasarkan data baru
        calculateNeeds(user.profile);
        await user.save();
        
        const updatedUser = await User.findById(user._id).select('-password');
        res.json({ message: 'Profil berhasil diperbarui', user: updatedUser });
    } catch (error) {
        console.error("Update Profile Error:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
});

// == Rute Dashboard (BARU & EFISIEN) ==
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const today = new Date().toISOString().split('T')[0];

        // 1. Ambil profil pengguna untuk target
        const user = await User.findById(userId).select('profile');
        if (!user || !user.profile) {
            return res.status(404).json({ message: 'Profil pengguna tidak ditemukan atau belum lengkap.' });
        }

        // 2. Ambil log makanan hari ini
        const todaysLogs = await FoodLog.find({ userId: userId, date: today });

        // 3. Hitung total konsumsi
        const consumed = todaysLogs.reduce((acc, log) => {
            const quantity = log.quantity || 1;
            acc.calories += (log.food.calories || 0) * quantity;
            acc.proteins += (log.food.proteins || 0) * quantity;
            acc.carbs += (log.food.carbs || 0) * quantity;
            acc.fats += (log.food.fats || 0) * quantity;
            return acc;
        }, { calories: 0, proteins: 0, carbs: 0, fats: 0 });

        // 4. Gabungkan semua data menjadi satu respons
        const dashboardData = {
            targets: user.profile,
            consumed: {
                calories: Math.round(consumed.calories),
                proteins: Math.round(consumed.proteins),
                carbs: Math.round(consumed.carbs),
                fats: Math.round(consumed.fats),
            },
            // Anda bisa menambahkan data lain di sini, misal: sleep, water, fasting
        };

        res.json(dashboardData);
    } catch (error) {
        console.error("Dashboard Data Error:", error);
        res.status(500).json({ message: 'Gagal mengambil data dashboard' });
    }
});

// == Rute Makanan & Log ==
app.get('/api/foods/categories', (req, res) => {
    res.json(foodCategories);
});

app.get('/api/foods', (req, res) => {
    const { search, category } = req.query;
    let results = [...foodDatabase];

    if (category) {
        results = results.filter(food => food.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
        results = results.filter(food => food.name.toLowerCase().includes(search.toLowerCase()));
    }
    res.json(results);
});

app.post('/api/log/food', authenticateToken, async (req, res) => { /* ... (kode sama) ... */ });
app.get('/api/log/history', authenticateToken, async (req, res) => { /* ... (kode sama) ... */ });

// == Rute Meal Planner (BARU) ==
app.get('/api/meal-planner', authenticateToken, async (req, res) => {
    try {
        const { date } = req.query; // Ambil berdasarkan tanggal, misal: '2025-10-14'
        if (!date) return res.status(400).json({ message: 'Parameter tanggal dibutuhkan' });
        
        const plan = await MealPlan.find({ userId: req.user.userId, date: date }).sort('time');
        res.json(plan);
    } catch (error) {
        console.error("Get Meal Plan Error:", error);
        res.status(500).json({ message: 'Gagal mengambil jadwal makan' });
    }
});

app.post('/api/meal-planner', authenticateToken, async (req, res) => {
    try {
        const { date, mealType, food, time } = req.body;
        const newPlanEntry = new MealPlan({
            userId: req.user.userId,
            date, mealType, food, time
        });
        await newPlanEntry.save();
        res.status(201).json(newPlanEntry);
    } catch (error) {
        console.error("Create Meal Plan Error:", error);
        res.status(500).json({ message: 'Gagal menambahkan jadwal makan' });
    }
});

app.delete('/api/meal-planner/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await MealPlan.findOneAndDelete({ _id: id, userId: req.user.userId });
        if (!result) {
            return res.status(404).json({ message: 'Jadwal tidak ditemukan atau Anda tidak berwenang.' });
        }
        res.status(200).json({ message: 'Jadwal berhasil dihapus.' });
    } catch (error) {
        console.error("Delete Meal Plan Error:", error);
        res.status(500).json({ message: 'Gagal menghapus jadwal makan' });
    }
});


// 8. Jalankan Server
app.listen(PORT, () => {
    console.log(`🚀 Server NutriBalance berjalan di http://localhost:${PORT}`);
});

