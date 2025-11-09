const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  getNotifications,
  createNotification,
  markNotificationAsRead,
  deleteNotification,
} = require('../controllers/userController');
const {authenticateToken } = require('../middlewares/authMiddleware');
router.route('/profile').get(authenticateToken, getUserProfile).put(authenticateToken, updateUserProfile);

router
  .route('/notifications')
  .get(authenticateToken, getNotifications)
  .post(authenticateToken, createNotification);

router
  .route('/notifications/:id')
  .put(authenticateToken, markNotificationAsRead)
  .delete(authenticateToken, deleteNotification);

module.exports = router;