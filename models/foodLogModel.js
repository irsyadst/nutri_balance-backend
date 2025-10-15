const mongoose = require('mongoose');

const FoodLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, index: true },
    food: { id: String, name: String, calories: Number, proteins: Number, carbs: Number, fats: Number, category: String },
    quantity: { type: Number, required: true },
    mealType: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('FoodLog', FoodLogSchema);