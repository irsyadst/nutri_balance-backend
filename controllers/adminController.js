const User = require('../models/userModel');
const FoodLog = require('../models/foodLogModel');

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        console.error("Admin Get Users Error:", error);
        res.status(500).json({ message: 'Gagal mengambil data pengguna' });
    }
};

exports.getAllLogs = async (req, res) => {
    try {
        const logs = await FoodLog.find({}).sort({ createdAt: -1 }).limit(50).populate('userId', 'name email');
        res.json(logs);
    } catch (error) {
        console.error("Admin Get Logs Error:", error);
        res.status(500).json({ message: 'Gagal mengambil data log' });
    }
};