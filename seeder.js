require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Impor bcrypt untuk hash password
const connectDB = require('./config/db');
const Food = require('./models/foodModel');
const User = require('./models/userModel'); // Impor User model
const foodData = require('./data/food_data.json');

connectDB();

// Fungsi impor data makanan (tetap sama)
const importData = async () => {
    try {
        await Food.deleteMany();
        await Food.insertMany(foodData);
        console.log('Data Makanan Berhasil Diimpor!');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

// Fungsi hapus data makanan (tetap sama)
const deleteData = async () => {
    try {
        await Food.deleteMany();
        console.log('Data Makanan Berhasil Dihapus!');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

// --- [FUNGSI BARU] ---
// Fungsi untuk membuat akun admin
const createAdmin = async () => {
    try {
        const adminEmail = 'admin@nutribalance.com';
        const adminPassword = 'adminpassword123'; // Ganti dengan password yang kuat

        // Cek apakah admin sudah ada
        const adminExists = await User.findOne({ email: adminEmail });
        if (adminExists) {
            console.log('Akun admin sudah ada.');
            process.exit();
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        // Buat user admin baru
        const adminUser = new User({
            name: 'Admin NutriBalance',
            email: adminEmail,
            password: hashedPassword,
            role: 'admin', // Set role sebagai admin
            profile: null // Admin tidak perlu profile kuesioner
        });

        await adminUser.save();
        console.log('Akun Admin Berhasil Dibuat!');
        console.log(`Email: ${adminEmail}`);
        console.log(`Password: ${adminPassword}`);
        process.exit();

    } catch (error) {
        console.error(`Error saat membuat admin: ${error.message}`);
        process.exit(1);
    }
};
// --- [AKHIR FUNGSI BARU] ---


// Logika untuk menjalankan fungsi via command line
if (process.argv[2] === '-d') {
    deleteData();
} else if (process.argv[2] === '-admin') { // Tambahan logika
    createAdmin();
} else {
    importData();
}