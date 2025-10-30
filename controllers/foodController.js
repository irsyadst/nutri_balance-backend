const FoodLog = require('../models/foodLogModel');
const MealPlan = require('../models/mealPlanModel');
const Food = require('../models/foodModel'); 
const User = require('../models/userModel');

exports.getFoodCategories = async (req, res) => {
    try {
        const categories = await Food.distinct('category');
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil kategori' });
    }
};

exports.searchFoods = async (req, res) => {
    try {
        const { search, category } = req.query;
        let query = {};
        if (category) query.category = category;
        if (search) query.name = new RegExp(search, 'i'); // Case-insensitive search

        const results = await Food.find(query).limit(50); // Batasi hasil
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: 'Gagal mencari makanan' });
    }
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
exports.generateMealPlan = async (req, res) => {
    try {
        const userId = req.user.userId;
        // Ambil data periode dari frontend
        const { period, startDate, endDate } = req.body; 

        // 1. Ambil Profil User (untuk Target & Restriksi)
        const user = await User.findById(userId);
        if (!user || !user.profile) {
            return res.status(404).json({ message: "Profil pengguna tidak ditemukan." });
        }

        const profile = user.profile;
        const { 
            targetCalories, targetProteins, targetCarbs, targetFats,
            dietaryRestrictions, allergies 
        } = profile;

        // 2. Buat Filter Query berdasarkan Pengecualian
        const queryFilter = {};

        if (allergies && allergies.length > 0) {
            // $nin = "not in". Mengecualikan makanan yang punya alergen ini.
            queryFilter.allergens = { $nin: allergies };
        }

        if (dietaryRestrictions && dietaryRestrictions.length > 0) {
            // $all = "all". Memastikan makanan memiliki SEMUA tag diet ini.
            // (Misal: jika user 'Vegan' dan 'Halal', makanan harus punya tag 'Vegan' DAN 'Halal')
            queryFilter.dietaryTags = { $all: dietaryRestrictions };
        }

        // 3. Ambil Makanan yang Sesuai Filter
        const availableFoods = await Food.find(queryFilter);
        if (availableFoods.length === 0) {
            return res.status(400).json({ message: "Tidak ada makanan yang sesuai dengan filter Anda. Perluas database Anda." });
        }

        // 4. Logika Generator (CONTOH SANGAT SEDERHANA)
        // Algoritma ini hanya memilih secara acak. 
        // Untuk hasil nyata, Anda perlu algoritma yang lebih kompleks (misal: Knapsack problem / optimasi)
        // untuk mencocokkan kalori dan makro secara presisi.

        // Tentukan target per porsi makan (Contoh: Pagi 30%, Siang 40%, Malam 30%)
        const breakfastTarget = targetCalories * 0.3;
        const lunchTarget = targetCalories * 0.4;
        const dinnerTarget = targetCalories * 0.3;

        // Fungsi helper sederhana untuk mencari makanan acak
        const findFoodForMeal = (targetCals) => {
            // Ini hanya memilih acak, TIDAK mencocokkan makro
            // Anda harus memperbaikinya untuk mencocokkan targetProteins, targetCarbs, dll.
            const food = availableFoods[Math.floor(Math.random() * availableFoods.length)];
            return food; 
        };

        // Tentukan tanggal yang akan di-generate (logika ini perlu disesuaikan)
        const datesToGenerate = []; 
        if (period === 'today') {
            datesToGenerate.push(new Date().toISOString().split('T')[0]);
        }
        // (Tambahkan logika untuk '3_days', '1_week', dan 'custom' di sini)

        // Hapus rencana lama untuk tanggal tersebut (opsional)
        await MealPlan.deleteMany({ userId: userId, date: { $in: datesToGenerate } });

        // 5. Buat dan Simpan Rencana Makan Baru
        let newPlans = [];
        for (const date of datesToGenerate) {
            const breakfastFood = findFoodForMeal(breakfastTarget);
            const lunchFood = findFoodForMeal(lunchTarget);
            const dinnerFood = findFoodForMeal(dinnerTarget);

            newPlans.push(
                { userId, date, mealType: 'Sarapan', food: breakfastFood, time: '08:00' },
                { userId, date, mealType: 'Makan Siang', food: lunchFood, time: '12:00' },
                { userId, date, mealType: 'Makan Malam', food: dinnerFood, time: '19:00' }
            );
        }

        await MealPlan.insertMany(newPlans);

        res.status(201).json({ message: 'Rencana makan berhasil dibuat!' });

    } catch (error) {
        console.error("Generate Meal Plan Error:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
};