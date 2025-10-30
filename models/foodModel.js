// models/foodModel.js
const mongoose = require('mongoose');

const FoodSchema = new mongoose.Schema({
    name: { type: String, required: true, index: true },
    calories: { type: Number, required: true },
    proteins: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fats: { type: Number, default: 0 },

    // Kategori yang Anda minta (e.g., 'Daging', 'Sayuran', 'Buah', 'Snack')
    category: { type: String, index: true },

    // Field untuk filter PANTANGAN (dietaryRestrictionOptions)
    dietaryTags: { 
        type: [String], 
        default: [],
        // Isi dengan: 'Vegetarian', 'Vegan', 'Halal', 'Keto', 'Mediterania', dll.
    },

    // Field untuk filter ALERGI (allergyOptions)
    allergens: { 
        type: [String], 
        default: [],
        // Isi dengan: 'Gluten', 'Susu', 'Gula', 'Kedelai', 'Kerang', 'Kacang', dll.
    }
}, { timestamps: true });

module.exports = mongoose.model('Food', FoodSchema);