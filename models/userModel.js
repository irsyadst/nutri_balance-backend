const mongoose = require('mongoose');

const UserProfileSchema = new mongoose.Schema({
    gender: String, age: Number, height: Number,
    currentWeight: Number, goalWeight: Number, wakeUpTime: String,
    sleepTime: String, firstMealTime: String, lastMealTime: String,
    dailyMealIntake: String, climate: String, waterIntake: String,
    activityLevel: String, goals: [String], fastingExperience: String,
    healthIssues: [String], targetCalories: Number, targetProteins: Number,
    targetCarbs: Number, targetFats: Number,
});

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    profile: UserProfileSchema,
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);