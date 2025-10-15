const mongoose = require('mongoose');

const MealPlanSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, index: true },
    mealType: { type: String, required: true },
    food: { type: Object, required: true },
    time: String,
});

module.exports = mongoose.model('MealPlan', MealPlanSchema);