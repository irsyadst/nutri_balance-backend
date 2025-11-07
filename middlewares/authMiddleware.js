const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

// Fungsi ini sudah benar
exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401); // Tidak ada token

    if (!JWT_SECRET) {
        console.error('❌ FATAL ERROR: JWT_SECRET tidak ditemukan.');
        return res.status(500).json({ message: 'Konfigurasi server tidak lengkap.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error("Kesalahan verifikasi JWT:", err.message);
            return res.sendStatus(403); // Token tidak valid
        }
        
        // Simpan payload user dari token ke req.user
        req.user = user;
        next(); // Lanjut ke middleware berikutnya
    });
};

// --- [TAMBAHAN] Middleware untuk Cek Role Admin ---
exports.isAdmin = (req, res, next) => {
    // Middleware ini HARUS dijalankan SETELAH authenticateToken
    // sehingga 'req.user' sudah terisi
    if (req.user && req.user.role === 'admin') {
        // Jika user ada dan rolenya 'admin', izinkan lanjut
        next();
    } else {
        // Jika bukan admin, kirim status Forbidden
        res.status(403).json({ message: 'Akses ditolak. Memerlukan hak admin.' });
    }
};
// --- [AKHIR TAMBAHAN] ---