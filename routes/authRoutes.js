const express = require('express');
const router = express.Router();
const { register, login, verifyOtp } = require('../controllers/authController');

router.post('/register', register);
router.post('/verify-otp', verifyOtp); // Rute baru
router.post('/login', login);

module.exports = router;