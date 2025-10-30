const mongoose = require('mongoose');

// Ini adalah Skema UNTUK data profil
const UserProfileSchema = new mongoose.Schema({
    gender: String,
    age: Number,
    height: Number,
    currentWeight: Number,
    goalWeight: Number,
    activityLevel: String,
    goals: [String],
    dietaryRestrictions: [String],
    allergies: [String],
    targetCalories: Number,
    targetProteins: Number,
    targetCarbs: Number,
    targetFats: Number,
});

// Ini adalah Skema UTAMA untuk pengguna
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: false }, // Password tidak wajib untuk login Google
    googleId: { type: String, unique: true, sparse: true }, // Field baru untuk ID Google
    
    profile: {
        type: UserProfileSchema,
        default: null // Default-nya null sampai kuesioner diisi
    }

}, { timestamps: true }); // Opsi timestamps berlaku untuk UserSchema

module.exports = mongoose.model('User', UserSchema);