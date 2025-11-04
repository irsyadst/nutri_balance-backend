const User = require('../models/userModel');
const Notification = require('../models/notificationModel');
const calculateNeeds = require('../utils/calculateNeeds');
// 1. Tambahkan require yang hilang
const asyncHandler = require('express-async-handler');

// 2. Ini kode Anda, hanya diubah format definisinya
const getUserProfile = asyncHandler(async (req, res) => {
    // Saya ganti req.user.userId menjadi req.user._id agar konsisten
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
        res.status(404);
        throw new Error("Pengguna tidak ditemukan");
    }
    res.json(user);
});

// 3. Ini kode Anda, hanya diubah format definisinya
const updateUserProfile = asyncHandler(async (req, res) => {
    // Saya ganti req.user.userId menjadi req.user._id agar konsisten
    const user = await User.findById(req.user._id);
    if (!user) {
        res.status(404);
        throw new Error("Pengguna tidak ditemukan");
    }

    user.profile = req.body;
    calculateNeeds(user.profile);
    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');
    res.json({ message: 'Profil berhasil diperbarui', user: updatedUser });
});

// --- FUNGSI NOTIFIKASI YANG BARU ---

// @desc    Get user notifications
// @route   GET /api/users/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({
    createdAt: -1,
  });
  res.json(notifications);
});

// @desc    Create new notification
// @route   POST /api/users/notifications
// @access  Private
const createNotification = asyncHandler(async (req, res) => {
  const { title, message } = req.body;

  if (!title || !message) {
    res.status(400);
    throw new Error('Please provide title and message');
  }

  const notification = new Notification({
    user: req.user._id,
    title,
    message,
    isRead: 'unread',
  });

  const createdNotification = await notification.save();
  res.status(201).json(createdNotification);
});

// @desc    Mark notification as read
// @route   PUT /api/users/notifications/:id
// @access  Private
const markNotificationAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (notification) {
    if (notification.user.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized');
    }
    notification.isRead = 'read';
    const updatedNotification = await notification.save();
    res.json(updatedNotification);
  } else {
    res.status(404);
    throw new Error('Notification not found');
  }
});

// @desc    Delete notification
// @route   DELETE /api/users/notifications/:id
// @access  Private
const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (notification) {
    if (notification.user.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized');
    }
    await notification.deleteOne();
    res.json({ message: 'Notification removed' });
  } else {
    res.status(404);
    throw new Error('Notification not found');
  }
});

// 4. Tambahkan 'module.exports' yang hilang di akhir file
module.exports = {
  getUserProfile,
  updateUserProfile,
  getNotifications,
  createNotification,
  markNotificationAsRead,
  deleteNotification,
};