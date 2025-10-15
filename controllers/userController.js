const User = require('../models/userModel');
const calculateNeeds = require('../utils/calculateNeeds');

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) return res.status(404).json({ message: "Pengguna tidak ditemukan" });
        res.json(user);
    } catch (error) {
        console.error("Get Profile Error:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: "Pengguna tidak ditemukan" });

        user.profile = req.body;
        calculateNeeds(user.profile);
        await user.save();

        const updatedUser = await User.findById(user._id).select('-password');
        res.json({ message: 'Profil berhasil diperbarui', user: updatedUser });
    } catch (error) {
        console.error("Update Profile Error:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
};