// 1. Import Dependencies
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// 2. Initial Setup
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;

// 3. Middleware
app.use(cors());
app.use(express.json());

// 4. Database Connection
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Database MongoDB connected successfully'))
    .catch(err => console.error('❌ Database connection error:', err));

// 5. Mongoose Schemas & Models (Struktur Data untuk Database)
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
    email: { type: String, required: true, unique: true },
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
});

const FoodLog = mongoose.model('FoodLog', FoodLogSchema);

// Data makanan statis, tidak perlu database untuk ini di awal
const foodDatabase = [
    { id: '1', name: 'Nasi Putih (100g)', calories: 130, proteins: 3, carbs: 28, fats: 0 },
    { id: '2', name: 'Dada Ayam Bakar (100g)', calories: 165, proteins: 31, carbs: 0, fats: 4 },
    { id: '3', name: 'Telur Rebus (1 butir)', calories: 78, proteins: 6, carbs: 1, fats: 5 },
    { id: '4', name: 'Tahu Goreng (50g)', calories: 80, proteins: 8, carbs: 2, fats: 5 },
    { id: '5', name: 'Tempe Goreng (50g)', calories: 100, proteins: 9, carbs: 8, fats: 5 },
];


// 6. Helper Functions & Middleware
const calculateNeeds = (profile) => {
    // ... (Fungsi ini tidak berubah)
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
    // ... (Middleware ini tidak berubah)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};


// 7. API Routes (Sekarang menggunakan Mongoose)

// == AUTH ROUTES ==
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email sudah terdaftar' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'Registrasi berhasil', userId: newUser._id });
    } catch (error) {
        res.status(500).json({ message: 'Terjadi kesalahan pada server', error });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) { return res.status(400).json({ message: 'Email atau password salah' }); }
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) { return res.status(400).json({ message: 'Email atau password salah' }); }

        const token = jwt.sign({ userId: user._id, name: user.name }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ message: 'Login berhasil', token });
    } catch (error) {
        res.status(500).json({ message: 'Terjadi kesalahan pada server', error });
    }
});


// == USER ROUTES ==
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Terjadi kesalahan pada server', error });
    }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
        
        user.profile = req.body;
        calculateNeeds(user.profile);
        await user.save();
        
        // Kirim kembali user tanpa password
        const updatedUser = await User.findById(user._id).select('-password');
        res.json({ message: 'Profil berhasil diperbarui', user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'Terjadi kesalahan pada server', error });
    }
});


// == FOOD & LOGGING ROUTES ==
app.get('/api/foods', (req, res) => {
    // ... (Endpoint ini tidak berubah)
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
        res.status(500).json({ message: 'Terjadi kesalahan pada server', error });
    }
});

app.get('/api/log/history', authenticateToken, async (req, res) => {
    try {
        const userLogs = await FoodLog.find({ userId: req.user.userId });
        res.json(userLogs);
    } catch (error) {
        res.status(500).json({ message: 'Terjadi kesalahan pada server', error });
    }
});


// 8. Start the Server
app.listen(PORT, () => {
    console.log(`🚀 Server NutriBalance berjalan di http://localhost:${PORT}`);
});
