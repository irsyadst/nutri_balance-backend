const mongoose = require('mongoose');

// Skema disederhanakan agar sesuai dengan kuesioner baru
const UserProfileSchema = new mongoose.Schema({
    // Data demografis dan fisik
    gender: String,
    age: Number,
    height: Number,
    currentWeight: Number,
    goalWeight: Number,
    activityLevel: String,
    
    // Tujuan dan preferensi
    goals: [String], // Contoh: ['Penurunan Berat Badan']
    healthIssues: [String], // Digunakan untuk 'Preferensi Makanan'
    
    // Hasil kalkulasi server
    targetCalories: Number,
    targetProteins: Number,
    targetCarbs: Number,
    targetFats: Number,
});

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    profile: UserProfileSchema,
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);