const express = require('express');
const router = express.Router();
const { getFoodCategories, searchFoods, logFood, getHistory, getMealPlan, generateMealPlan } = require('../controllers/foodController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.get('/foods/categories', getFoodCategories);
router.get('/foods', searchFoods);

router.post('/log/food', authenticateToken, logFood);
router.get('/log/history', authenticateToken, getHistory);

router.get('/meal-planner', authenticateToken, getMealPlan);
router.post('/food/generate-meal-plan', authenticateToken, generateMealPlan);
module.exports = router;