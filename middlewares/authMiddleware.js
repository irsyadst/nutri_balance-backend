const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    if (!JWT_SECRET) {
        console.error('❌ FATAL ERROR: JWT_SECRET tidak ditemukan.');
        return res.status(500).json({ message: 'Konfigurasi server tidak lengkap.' });
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error("Kesalahan verifikasi JWT:", err.message);
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};