const FoodLog = require('../models/foodLogModel');
const MealPlan = require('../models/mealPlanModel');

// Data makanan statis
const foodDatabase = [
    { id: '1', name: 'Nasi Putih (100g)', calories: 130, proteins: 3, carbs: 28, fats: 0, category: 'Lainnya' },
    { id: '2', name: 'Dada Ayam Bakar (100g)', calories: 165, proteins: 31, carbs: 0, fats: 4, category: 'Daging' },
    { id: '3', name: 'Telur Rebus (1 butir)', calories: 78, proteins: 6, carbs: 1, fats: 5, category: 'Lainnya' },
    { id: '4', name: 'Salad Sayur', calories: 50, proteins: 2, carbs: 10, fats: 1, category: 'Salad' },
    { id: '5', name: 'Honey Pancake', calories: 180, proteins: 5, carbs: 30, fats: 4, category: 'Kue' },
];
const foodCategories = ['Salad', 'Kue', 'Pie', 'Smoothie', 'Daging', 'Lainnya'];

exports.getFoodCategories = (req, res) => res.json(foodCategories);

exports.searchFoods = (req, res) => {
    const { search, category } = req.query;
    let results = [...foodDatabase];
    if (category) results = results.filter(f => f.category.toLowerCase() === category.toLowerCase());
    if (search) results = results.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
    res.json(results);
};

exports.logFood = async (req, res) => {
    try {
        const { foodId, quantity, mealType } = req.body;
        const food = foodDatabase.find(f => f.id === foodId);
        if (!food) return res.status(404).json({ message: 'Makanan tidak ditemukan' });
        const logEntry = new FoodLog({ userId: req.user.userId, date: new Date().toISOString().split('T')[0], food, quantity, mealType });
        await logEntry.save();
        res.status(201).json({ message: 'Makanan berhasil dicatat', log: logEntry });
    } catch (error) {
        console.error("Log Food Error:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const userLogs = await FoodLog.find({ userId: req.user.userId }).sort({ createdAt: -1 });
        res.json(userLogs);
    } catch (error) {
        console.error("Get History Error:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
};

// Controller untuk Meal Planner
exports.getMealPlan = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ message: 'Parameter tanggal dibutuhkan' });
        const plan = await MealPlan.find({ userId: req.user.userId, date: date }).sort('time');
        res.json(plan);
    } catch (error) {
        console.error("Get Meal Plan Error:", error);
        res.status(500).json({ message: 'Gagal mengambil jadwal makan' });
    }
};