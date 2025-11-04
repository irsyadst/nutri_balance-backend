const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  getNotifications,
  // Tambahkan fungsi baru di bawah
  createNotification,
  markNotificationAsRead,
  deleteNotification,
} = require('../controllers/userController');
const {authenticateToken } = require('../middlewares/authMiddleware');
router.route('/profile').get(authenticateToken, getUserProfile).put(authenticateToken, updateUserProfile);

router
  .route('/notifications')
  .get(authenticateToken, getNotifications)
  // Tambahkan route POST untuk membuat notifikasi baru
  .post(authenticateToken, createNotification);

router
  .route('/notifications/:id')
  // Tambahkan route PUT untuk update "mark as read"
  .put(authenticateToken, markNotificationAsRead)
  // Tambahkan route DELETE untuk menghapus notifikasi
  .delete(authenticateToken, deleteNotification);

module.exports = router;