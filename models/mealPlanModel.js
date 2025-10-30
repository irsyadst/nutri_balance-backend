const mongoose = require('mongoose');

const MealPlanSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, index: true },
    mealType: { type: String, required: true },
    food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true },
    time: String,
    quantity: { type: Number, required: true, default: 1 }
});

module.exports = mongoose.model('MealPlan', MealPlanSchema);