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
const { protect } = require('../middlewares/authMiddleware');

router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);

router
  .route('/notifications')
  .get(protect, getNotifications)
  // Tambahkan route POST untuk membuat notifikasi baru
  .post(protect, createNotification);

router
  .route('/notifications/:id')
  // Tambahkan route PUT untuk update "mark as read"
  .put(protect, markNotificationAsRead)
  // Tambahkan route DELETE untuk menghapus notifikasi
  .delete(protect, deleteNotification);

module.exports = router;