const express = require('express');
const router = express.Router();
const { getAllUsers, getAllLogs } = require('../controllers/adminController');
// TODO: Tambahkan middleware otentikasi khusus admin di sini

router.get('/users', getAllUsers);
router.get('/logs', getAllLogs);

module.exports = router;