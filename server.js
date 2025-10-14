// 1. Impor Dependensi
// =============================================================================
require('dotenv').config(); // Memuat variabel lingkungan dari file .env
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// 2. Pengaturan Awal Aplikasi
// =============================================================================
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;

// 3. Middleware Global
// =============================================================================
app.use(cors()); // Mengizinkan permintaan dari domain lain (Cross-Origin Resource Sharing)
app.use(express.json()); // Mem-parsing body permintaan yang masuk sebagai JSON
app.use(express.static('public')); // Menyajikan file statis (seperti admin.html) dari folder 'public'

// 4. Koneksi ke Database MongoDB
// =============================================================================
if (!MONGO_URI) {
    console.error('❌ FATAL ERROR: MONGO_URI tidak ditemukan di environment variables.');
    process.exit(1); // Menghentikan aplikasi jika URI database tidak ada
}
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Database MongoDB berhasil tersambung'))
    .catch(err => console.error('❌ Kesalahan koneksi database:', err));

// 5. Skema & Model Mongoose (Struktur Data)
// =============================================================================

/**
 * @desc Skema untuk data profil pengguna yang diisi melalui kuesioner.
 */
const UserProfileSchema = new mongoose.Schema({
    gender: String, age: Number, height: Number,
    currentWeight: Number, goalWeight: Number, wakeUpTime: String,
    sleepTime: String, firstMealTime: String, lastMealTime: String,
    dailyMealIntake: String, climate: String, waterIntake: String,
    activityLevel: String, goals: [String], fastingExperience: String,
    healthIssues: [String], 
    // Data yang dihitung oleh server
    targetCalories: Number, targetProteins: Number,
    targetCarbs: Number, targetFats: Number,
});

/**
 * @desc Skema utama untuk data pengguna, termasuk kredensial dan profil.
 */
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    profile: UserProfileSchema,
}, { timestamps: true }); // Otomatis menambahkan createdAt dan updatedAt

const User = mongoose.model('User', UserSchema);

/**
 * @desc Skema untuk mencatat setiap makanan yang dikonsumsi pengguna.
 */
const FoodLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, index: true }, // Format YYYY-MM-DD
    food: {
        id: String, name: String, calories: Number,
        proteins: Number, carbs: Number, fats: Number, category: String,
    },
    quantity: { type: Number, required: true },
    mealType: { type: String, required: true }, // e.g., "Sarapan"
}, { timestamps: true });

const FoodLog = mongoose.model('FoodLog', FoodLogSchema);

/**
 * @desc Skema untuk fitur Meal Planner, menjadwalkan makanan.
 */
const MealPlanSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, index: true }, // Format YYYY-MM-DD
    mealType: { type: String, required: true }, // e.g., "Sarapan"
    food: { type: Object, required: true },
    time: String, // e.g., "07:00am"
});

const MealPlan = mongoose.model('MealPlan', MealPlanSchema);

// Data makanan statis. Di aplikasi skala besar, ini akan menjadi koleksi sendiri di MongoDB.
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


// 6. Fungsi Bantuan & Middleware
// =============================================================================

/**
 * @desc Menghitung kebutuhan kalori harian (TDEE) dan makronutrien berdasarkan profil pengguna.
 * @param {object} profile - Objek profil pengguna.
 */
const calculateNeeds = (profile) => {
    if (!profile || !profile.currentWeight || !profile.height || !profile.age) return;
    let bmr;
    // Rumus Harris-Benedict
    if (profile.gender === 'Pria') { 
        bmr = 88.362 + (13.397 * profile.currentWeight) + (4.799 * profile.height) - (5.677 * profile.age); 
    } else { 
        bmr = 447.593 + (9.247 * profile.currentWeight) + (3.098 * profile.height) - (4.330 * profile.age); 
    }
    let activityMultiplier = 1.2; // Menetap
    if (profile.activityLevel === 'Aktivitas Ringan') activityMultiplier = 1.375;
    if (profile.activityLevel === 'Aktivitas Sedang') activityMultiplier = 1.55;
    if (profile.activityLevel === 'Sangat Aktif') activityMultiplier = 1.725;
    
    let tdee = bmr * activityMultiplier;
    
    // Menyesuaikan kalori berdasarkan tujuan utama pengguna
    if (profile.goals && profile.goals.includes('Penurunan berat badan')) {
        tdee -= 500; // Defisit kalori
    } else if (profile.goals && profile.goals.includes('Peningkatan massa otot')) {
        tdee += 500; // Surplus kalori
    }

    profile.targetCalories = Math.round(tdee);
    profile.targetCarbs = Math.round((tdee * 0.45) / 4); // 45% Carbs
    profile.targetProteins = Math.round((tdee * 0.30) / 4); // 30% Protein
    profile.targetFats = Math.round((tdee * 0.25) / 9); // 25% Fats
};

/**
 * @desc Middleware untuk memverifikasi token JWT pada setiap permintaan yang diproteksi.
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"
    
    if (token == null) return res.sendStatus(401); // Unauthorized

    if (!JWT_SECRET) {
        console.error('❌ FATAL ERROR: JWT_SECRET tidak ditemukan.');
        return res.status(500).json({ message: 'Konfigurasi server tidak lengkap.' });
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error("Kesalahan verifikasi JWT:", err.message);
            return res.sendStatus(403); // Forbidden
        }
        req.user = user; // Menyimpan data user dari token ke objek request
        next(); // Melanjutkan ke fungsi/rute selanjutnya
    });
};


// 7. Rute API (API Routes)
// =============================================================================

// --- Rute Autentikasi ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ message: "Semua field wajib diisi." });
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) return res.status(400).json({ message: 'Email sudah terdaftar' });
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email: email.toLowerCase(), password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'Registrasi berhasil', userId: newUser._id });
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email dan password wajib diisi.' });
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(401).json({ message: 'Email atau password salah' });
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(401).json({ message: 'Email atau password salah' });
        const token = jwt.sign({ userId: user._id, name: user.name }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ message: 'Login berhasil', token });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
});

// --- Rute Pengguna ---
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) return res.status(404).json({ message: "Pengguna tidak ditemukan" });
        res.json(user);
    } catch (error) {
        console.error("Get Profile Error:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: "Pengguna tidak ditemukan" });
        user.profile = req.body;
        calculateNeeds(user.profile);
        await user.save();
        const updatedUser = await User.findById(user._id).select('-password');
        res.json({ message: 'Profil berhasil diperbarui', user: updatedUser });
    } catch (error) {
        console.error("Update Profile Error:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
});

// --- Rute Dashboard ---
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const today = new Date().toISOString().split('T')[0];
        const user = await User.findById(userId).select('profile');
        if (!user || !user.profile) return res.status(404).json({ message: 'Profil pengguna belum lengkap.' });

        const todaysLogs = await FoodLog.find({ userId: userId, date: today });
        const consumed = todaysLogs.reduce((acc, log) => {
            const quantity = log.quantity || 1;
            acc.calories += (log.food.calories || 0) * quantity;
            acc.proteins += (log.food.proteins || 0) * quantity;
            acc.carbs += (log.food.carbs || 0) * quantity;
            acc.fats += (log.food.fats || 0) * quantity;
            return acc;
        }, { calories: 0, proteins: 0, carbs: 0, fats: 0 });

        const dashboardData = {
            targets: user.profile,
            consumed: {
                calories: Math.round(consumed.calories),
                proteins: Math.round(consumed.proteins),
                carbs: Math.round(consumed.carbs),
                fats: Math.round(consumed.fats),
            },
        };
        res.json(dashboardData);
    } catch (error) {
        console.error("Dashboard Data Error:", error);
        res.status(500).json({ message: 'Gagal mengambil data dashboard' });
    }
});

// --- Rute Makanan & Pencatatan ---
app.get('/api/foods/categories', (req, res) => res.json(foodCategories));

app.get('/api/foods', (req, res) => {
    const { search, category } = req.query;
    let results = [...foodDatabase];
    if (category) results = results.filter(f => f.category.toLowerCase() === category.toLowerCase());
    if (search) results = results.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
    res.json(results);
});

app.post('/api/log/food', authenticateToken, async (req, res) => {
    try {
        const { foodId, quantity, mealType } = req.body;
        const food = foodDatabase.find(f => f.id === foodId);
        if (!food) return res.status(404).json({ message: 'Makanan tidak ditemukan' });
        const logEntry = new FoodLog({
            userId: req.user.userId,
            date: new Date().toISOString().split('T')[0],
            food, quantity, mealType,
        });
        await logEntry.save();
        res.status(201).json({ message: 'Makanan berhasil dicatat', log: logEntry });
    } catch (error) {
        console.error("Log Food Error:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
});

app.get('/api/log/history', authenticateToken, async (req, res) => {
    try {
        const userLogs = await FoodLog.find({ userId: req.user.userId }).sort({ createdAt: -1 });
        res.json(userLogs);
    } catch (error) {
        console.error("Get History Error:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
});

// --- Rute Meal Planner ---
app.get('/api/meal-planner', authenticateToken, async (req, res) => {
    try {
        const { date } = req.query;
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
        const newPlanEntry = new MealPlan({ userId: req.user.userId, date, mealType, food, time });
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
        if (!result) return res.status(404).json({ message: 'Jadwal tidak ditemukan atau Anda tidak berwenang.' });
        res.status(200).json({ message: 'Jadwal berhasil dihapus.' });
    } catch (error) {
        console.error("Delete Meal Plan Error:", error);
        res.status(500).json({ message: 'Gagal menghapus jadwal makan' });
    }
});


// 8. Jalankan Server
// =============================================================================
app.listen(PORT, () => {
    console.log(`🚀 Server NutriBalance berjalan di http://localhost:${PORT}`);
});

