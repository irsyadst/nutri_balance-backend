const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.error('❌ FATAL ERROR: MONGO_URI tidak ditemukan di environment variables.');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Database MongoDB berhasil tersambung');
    } catch (err) {
        console.error('❌ Kesalahan koneksi database:', err.message);
        process.exit(1);
    }
};

module.exports = connectDB;