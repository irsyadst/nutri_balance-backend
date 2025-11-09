const mongoose = require('mongoose');

const FoodSchema = new mongoose.Schema({
    name: { type: String, required: true, index: true },
    calories: { type: Number, required: true },
    proteins: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fats: { type: Number, default: 0 },


    servingQuantity: { type: Number, default: 1 },
    servingUnit: { type: String, default: 'porsi' },
    category: { type: String, index: true },

    dietaryTags: { 
        type: [String], 
        default: [],
    },

    allergens: { 
        type: [String], 
        default: [],
    }
}, { timestamps: true });

module.exports = mongoose.model('Food', FoodSchema);