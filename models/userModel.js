const mongoose = require('mongoose');

const UserProfileSchema = new mongoose.Schema({
    gender: String, age: Number, height: Number,
    currentWeight: Number, goalWeight: Number, activityLevel: String,
    goals: [String], dietaryRestrictions: [String], allergies: [String],
    targetCalories: Number, targetProteins: Number,
    targetCarbs: Number, targetFats: Number,
});

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: false }, // Password tidak wajib untuk login Google
    googleId: { type: String, unique: true, sparse: true }, // Field baru untuk ID Google
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);