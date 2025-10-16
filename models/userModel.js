const mongoose = require('mongoose');

// Skema disesuaikan dengan dua field baru
const UserProfileSchema = new mongoose.Schema({
    // Data demografis dan fisik
    gender: String,
    age: Number,
    height: Number,
    currentWeight: Number,
    goalWeight: Number,
    activityLevel: String,
    
    // Tujuan dan preferensi (dipisahkan)
    goals: [String], 
    dietaryRestrictions: [String], // Field baru untuk pembatasan diet
    allergies: [String],           // Field baru untuk alergi
    
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