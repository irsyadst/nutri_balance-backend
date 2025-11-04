const express = require('express');
const router = express.Router();
const { getProfile, updateProfile } = require('../controllers/userController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { getProfile, updateProfile, getNotifications } = require('../controllers/userController');


router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);

router.get('/notifications', authenticateToken, getNotifications);

module.exports = router;