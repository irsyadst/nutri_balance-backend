const User = require('../models/userModel');
const Notification = require('../models/notificationModel');
const calculateNeeds = require('../utils/calculateNeeds');
// Tambahkan require yang hilang
const asyncHandler = require('express-async-handler');

// --- PERBAIKAN: Ubah 'exports.getProfile' menjadi 'const getUserProfile' ---
const getUserProfile = asyncHandler(async (req, res) => {
  // Gunakan req.user._id (sesuai authMiddleware)
  const user = await User.findById(req.user._id).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('Pengguna tidak ditemukan');
  }
  res.json(user);
});

// --- PERBAIKAN: Ubah 'exports.updateProfile' menjadi 'const updateUserProfile' ---
const updateUserProfile = asyncHandler(async (req, res) => {
  // Gunakan req.user._id
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('Pengguna tidak ditemukan');
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
  // Gunakan req.user._id
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
    isRead: 'unread', // Default saat dibuat
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
    // Pastikan notifikasi milik user yang login
    if (notification.user.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized');
    }

    // Ubah field isRead menjadi 'read' sesuai permintaan
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
    // Pastikan notifikasi milik user yang login
    if (notification.user.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized');
    }

    await notification.deleteOne(); // Mongoose v6+
    res.json({ message: 'Notification removed' });
  } else {
    res.status(404);
    throw new Error('Notification not found');
  }
});

// --- PERBAIKAN: Tambahkan 'module.exports' yang hilang ---
module.exports = {
  getUserProfile,
  updateUserProfile,
  getNotifications,
  createNotification,
  markNotificationAsRead,
  deleteNotification,
};