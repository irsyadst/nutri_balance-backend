// 1. Import Dependencies
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// 2. Initial Setup
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-super-secret-key-for-nutribalance-app'; // Ganti dengan secret key yang lebih aman

// 3. Middleware
app.use(cors()); // Mengizinkan request dari domain lain (misalnya aplikasi Flutter)
app.use(express.json()); // Mem-parsing body request sebagai JSON

// 4. In-Memory Database (Simulasi)
let users = [];
let foodLogs = {}; // { "userId": [{...logData}] }

const foodDatabase = [
    { id: '1', name: 'Nasi Putih (100g)', calories: 130, proteins: 3, carbs: 28, fats: 0 },
    { id: '2', name: 'Dada Ayam Bakar (100g)', calories: 165, proteins: 31, carbs: 0, fats: 4 },
    { id: '3', name: 'Telur Rebus (1 butir)', calories: 78, proteins: 6, carbs: 1, fats: 5 },
    { id: '4', name: 'Tahu Goreng (50g)', calories: 80, proteins: 8, carbs: 2, fats: 5 },
    { id: '5', name: 'Tempe Goreng (50g)', calories: 100, proteins: 9, carbs: 8, fats: 5 },
    { id: '6', name: 'Apel (1 buah)', calories: 95, proteins: 1, carbs: 25, fats: 0 },
    { id: '7', name: 'Pisang (1 buah)', calories: 105, proteins: 1, carbs: 27, fats: 0 },
    { id: '8', name: 'Sayur Bayam (100g)', calories: 23, proteins: 2, carbs: 4, fats: 0 },
];


// 5. Helper Functions & Middleware
const calculateNeeds = (profile) => {
    if (!profile || !profile.weight || !profile.height || !profile.age) return;
    
    let bmr;
    if (profile.gender === 'Pria') {
      bmr = 88.362 + (13.397 * profile.weight) + (4.799 * profile.height) - (5.677 * profile.age);
    } else {
      bmr = 447.593 + (9.247 * profile.weight) + (3.098 * profile.height) - (4.330 * profile.age);
    }

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

// Middleware untuk verifikasi token JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // Unauthorized

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Forbidden
        req.user = user;
        next();
    });
};


// 6. API Routes

// == AUTH ROUTES ==
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Nama, email, dan password harus diisi' });
        }
        
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ message: 'Email sudah terdaftar' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: `user-${Date.now()}`,
            name,
            email,
            password: hashedPassword,
            profile: null, // Profil diisi setelahnya
        };
        users.push(newUser);
        
        console.log('User registered:', newUser);
        res.status(201).json({ message: 'Registrasi berhasil', userId: newUser.id });
    } catch (error) {
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    
    if (!user) {
        return res.status(400).json({ message: 'Email atau password salah' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(400).json({ message: 'Email atau password salah' });
    }
    
    const token = jwt.sign({ userId: user.id, name: user.name }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ message: 'Login berhasil', token });
});


// == USER ROUTES (Protected) ==
app.get('/api/user/profile', authenticateToken, (req, res) => {
    const user = users.find(u => u.id === req.user.userId);
    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

    // Jangan kirim password ke client
    const { password, ...userProfile } = user;
    res.json(userProfile);
});

app.put('/api/user/profile', authenticateToken, (req, res) => {
    const user = users.find(u => u.id === req.user.userId);
    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

    const { gender, age, weight, height, activityLevel, goal } = req.body;
    user.profile = { gender, age, weight, height, activityLevel, goal };
    
    calculateNeeds(user.profile); // Hitung kebutuhan nutrisi
    
    const { password, ...updatedUser } = user;
    res.json({ message: 'Profil berhasil diperbarui', user: updatedUser });
});


// == FOOD & LOGGING ROUTES ==
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

app.post('/api/log/food', authenticateToken, (req, res) => {
    const { userId } = req.user;
    const { foodId, quantity, mealType } = req.body;

    const food = foodDatabase.find(f => f.id === foodId);
    if (!food) return res.status(404).json({ message: 'Makanan tidak ditemukan' });

    const logEntry = {
        logId: `log-${Date.now()}`,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        food,
        quantity,
        mealType,
    };

    if (!foodLogs[userId]) {
        foodLogs[userId] = [];
    }
    foodLogs[userId].push(logEntry);

    console.log(`Food logged for user ${userId}:`, logEntry);
    res.status(201).json({ message: 'Makanan berhasil dicatat', log: logEntry });
});

app.get('/api/log/history', authenticateToken, (req, res) => {
    const { userId } = req.user;
    const userLogs = foodLogs[userId] || [];
    
    // Untuk contoh sederhana, kita kirim semua log.
    // Di aplikasi nyata, Anda akan memfilter berdasarkan tanggal dari query param.
    res.json(userLogs);
});


// 7. Start the Server
app.listen(PORT, () => {
    console.log(`🚀 Server NutriBalance berjalan di http://localhost:${PORT}`);
});