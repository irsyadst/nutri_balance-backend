// 1. Impor Dependensi
require('dotenv').config(); // Muat variabel lingkungan dari file .env
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
app.use(cors()); // Mengizinkan permintaan dari domain lain
app.use(express.json()); // Mem-parsing body permintaan sebagai JSON
app.use(express.static('public')); // Menyajikan file statis dari folder 'public'

// 4. Koneksi ke Database
if (!MONGO_URI) {
    console.error('❌ FATAL ERROR: MONGO_URI tidak ditemukan di environment variables.');
    process.exit(1); // Keluar dari aplikasi jika koneksi DB tidak ada
}
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Database MongoDB berhasil tersambung'))
    .catch(err => console.error('❌ Kesalahan koneksi database:', err));

// 5. Skema & Model Mongoose (Struktur Data untuk Database)
const UserProfileSchema = new mongoose.Schema({
    gender: String,
    age: Number,
    weight: Number,
    height: Number,
    activityLevel: String,
    goal: String,
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
});

const User = mongoose.model('User', UserSchema);

const FoodLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // Format YYYY-MM-DD
    food: {
        id: String,
        name: String,
        calories: Number,
        proteins: Number,
        carbs: Number,
        fats: Number,
    },
    quantity: { type: Number, required: true },
    mealType: { type: String, required: true },
}, { timestamps: true }); // Menambahkan createdAt & updatedAt secara otomatis

const FoodLog = mongoose.model('FoodLog', FoodLogSchema);

// Database makanan statis
const foodDatabase = [
    { id: '1', name: 'Nasi Putih (100g)', calories: 130, proteins: 3, carbs: 28, fats: 0 },
    { id: '2', name: 'Dada Ayam Bakar (100g)', calories: 165, proteins: 31, carbs: 0, fats: 4 },
    { id: '3', name: 'Telur Rebus (1 butir)', calories: 78, proteins: 6, carbs: 1, fats: 5 },
    { id: '4', name: 'Tahu Goreng (50g)', calories: 80, proteins: 8, carbs: 2, fats: 5 },
    { id: '5', name: 'Tempe Goreng (50g)', calories: 100, proteins: 9, carbs: 8, fats: 5 },
];


// 6. Fungsi Bantuan & Middleware
const calculateNeeds = (profile) => {
    // Fungsi ini tidak berubah
    if (!profile || !profile.weight || !profile.height || !profile.age) return;
    let bmr;
    if (profile.gender === 'Pria') { bmr = 88.362 + (13.397 * profile.weight) + (4.799 * profile.height) - (5.677 * profile.age); } else { bmr = 447.593 + (9.247 * profile.weight) + (3.098 * profile.height) - (4.330 * profile.age); }
    let activityMultiplier = 1.2;
    if (profile.activityLevel === 'Sedang') activityMultiplier = 1.55;
    if (profile.activityLevel === 'Aktif') activityMultiplier = 1.9;
    let tdee = bmr * activityMultiplier;
    if (profile.goal === 'Menurunkan berat badan') tdee -= 500;
    if (profile.goal === 'Menambah berat badan') tdee += 500;
    profile.targetCalories = Math.round(tdee);
    profile.targetCarbs = Math.round((tdee * 0.40) / 4);
    profile.targetProteins = Math.round((tdee * 0.30) / 4);
    profile.targetFats = Math.round((tdee * 0.30) / 9);
};

const authenticateToken = (req, res, next) => {
    // Middleware untuk memverifikasi token JWT
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401); // Unauthorized

    if (!JWT_SECRET) {
        console.error('❌ FATAL ERROR: JWT_SECRET tidak ditemukan di environment variables.');
        return res.status(500).json({ message: 'Konfigurasi server tidak lengkap.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error("Kesalahan verifikasi JWT:", err.message);
            return res.sendStatus(403); // Forbidden
        }
        req.user = user;
        next();
    });
};


// 7. Rute API (API Routes)

// == Rute Admin (Untuk Dashboard) ==
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        console.error("Admin Get Users Error:", error);
        res.status(500).json({ message: 'Gagal mengambil data pengguna' });
    }
});

app.get('/api/admin/logs', async (req, res) => {
    try {
        const logs = await FoodLog.find({}).sort({ createdAt: -1 }).limit(50).populate('userId', 'name email');
        res.json(logs);
    } catch (error) {
        console.error("Admin Get Logs Error:", error);
        res.status(500).json({ message: 'Gagal mengambil data log' });
    }
});

// == Rute Autentikasi ==
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Nama, email, dan password wajib diisi." });
        }
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'Email sudah terdaftar' });
        }
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
        if (!email || !password) {
            return res.status(400).json({ message: 'Email dan password wajib diisi.' });
        }
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: 'Email atau password salah' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Email atau password salah' });
        }
        const token = jwt.sign({ userId: user._id, name: user.name }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ message: 'Login berhasil', token });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
});

// == Rute Pengguna (Diproteksi) ==
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

// == Rute Makanan & Log ==
app.get('/api/foods', (req, res) => {
    const { search } = req.query;
    if (search) {
        const results = foodDatabase.filter(food => 
            food.name.toLowerCase().includes(search.toLowerCase())
        );
        return res.json(results);
    }
    res.json(foodDatabase);
});

app.post('/api/log/food', authenticateToken, async (req, res) => {
    try {
        const { foodId, quantity, mealType } = req.body;
        const food = foodDatabase.find(f => f.id === foodId);
        if (!food) return res.status(404).json({ message: 'Makanan tidak ditemukan' });

        const logEntry = new FoodLog({
            userId: req.user.userId,
            date: new Date().toISOString().split('T')[0],
            food: food,
            quantity: quantity,
            mealType: mealType,
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


// 8. Jalankan Server
app.listen(PORT, () => {
    console.log(`🚀 Server NutriBalance berjalan di http://localhost:${PORT}`);
});

