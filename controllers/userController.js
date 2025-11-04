const User = require('../models/userModel');
const Notification = require('../models/notificationModel');
const calculateNeeds = require('../utils/calculateNeeds');
const asyncHandler = require('express-async-handler');

// --- PERBAIKAN: Kembali gunakan req.user.userId ---
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('Pengguna tidak ditemukan');
  }
  res.json(user);
});

// --- PERBAIKAN: Kembali gunakan req.user.userId ---
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) {
    res.status(404);
    throw new Error('Pengguna tidak ditemukan');
  }

  user.profile = req.body;
  calculateNeeds(user.profile);
  await user.save();

  const updatedUser = await User.findById(user.userId).select('-password');
  res.json({ message: 'Profil berhasil diperbarui', user: updatedUser });
});

// --- FUNGSI NOTIFIKASI (DIPERBAIKI) ---

// @desc    Get user notifications
// @route   GET /api/users/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
  // --- PERBAIKAN: Gunakan 'userId' (sesuai notificationModel.js) ---
  const notifications = await Notification.find({ userId: req.user.userId }).sort({
    createdAt: -1,
  });
  res.json(notifications);
});

// @desc    Create new notification
// @route   POST /api/users/notifications
// @access  Private
const createNotification = asyncHandler(async (req, res) => {
  // 'message' dari frontend kita map ke 'body' di backend
  const { title, message } = req.body;

  if (!title || !message) {
    res.status(400);
    throw new Error('Please provide title and message');
  }

  const notification = new Notification({
    userId: req.user.userId, // <-- PERBAIKAN
    title: title,
    body: message, // <-- PERBAIKAN (model Anda menggunakan 'body')
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
    // --- PERBAIKAN: Gunakan 'userId' ---
    if (notification.userId.toString() !== req.user.userId.toString()) {
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
    // --- PERBAIKAN: Gunakan 'userId' ---
    if (notification.userId.toString() !== req.user.userId.toString()) {
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

// Ekspor yang sudah benar
module.exports = {
  getUserProfile,
  updateUserProfile,
  getNotifications,
  createNotification,
  markNotificationAsRead,
  deleteNotification,
};