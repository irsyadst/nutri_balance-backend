const User = require('../models/userModel');
const Notification = require('../models/notificationModel');
const calculateNeeds = require('../utils/calculateNeeds');
const asyncHandler = require('express-async-handler');

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('Pengguna tidak ditemukan');
  }
  res.json(user);
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) {
    res.status(404);
    throw new Error('Pengguna tidak ditemukan');
  }

  if (!user.profile) {
    user.profile = {};
  }
  
  Object.assign(user.profile, req.body);
  calculateNeeds(user.profile);
  await user.save();

  const updatedUser = await User.findById(user.userId).select('-password');
  res.json({ message: 'Profil berhasil diperbarui', user: updatedUser });
});

const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user.userId }).sort({
    createdAt: -1,
  });
  res.json(notifications);
});

const createNotification = asyncHandler(async (req, res) => {
  const { title, message } = req.body;

  if (!title || !message) {
    res.status(400);
    throw new Error('Please provide title and message');
  }

  const notification = new Notification({
    userId: req.user.userId,
    title: title,
    body: message, 
    isRead: false,
  });

  const createdNotification = await notification.save();
  res.status(201).json(createdNotification);
});

const markNotificationAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (notification) {
    if (notification.userId.toString() !== req.user.userId.toString()) {
      res.status(401);
      throw new Error('Not authorized');
    }
    
    notification.isRead = true; 
    
    const updatedNotification = await notification.save();
    res.json(updatedNotification);
  } else {
    res.status(404);
    throw new Error('Notification not found');
  }
});

const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (notification) {
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

module.exports = {
  getUserProfile,
  updateUserProfile,
  getNotifications,
  createNotification,
  markNotificationAsRead,
  deleteNotification,
};