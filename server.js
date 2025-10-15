require('dotenv').config();
const express = require('express');
const path = require('path'); // Impor modul 'path'
const cors = require('cors');
const connectDB = require('./config/db');

// Impor rute-rute
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const foodRoutes = require('./routes/foodRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Inisialisasi aplikasi Express
const app = express();

// Koneksi ke Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
// Menyajikan file statis dari folder 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Gunakan Rute API
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api', foodRoutes);
app.use('/api/admin', adminRoutes);

// Rute untuk menyajikan Landing Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di port ${PORT}`);
});

