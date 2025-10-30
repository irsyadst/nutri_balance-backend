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

exports.getMealPlan = async (req, res) => {
    try {
        const { date } = req.query; // Kita akan mengirim tanggal dari Flutter

        if (!date) {
            return res.status(400).json({ message: 'Query tanggal diperlukan.' });
        }
        
        // Format tanggal ISO 'YYYY-MM-DD'
        const plans = await MealPlan.find({ 
            userId: req.user.userId,
            date: date 
        }).populate('food'); // 'populate' sangat penting untuk mengambil detail 'food'

        res.json(plans);
    } catch (error) {
        console.error("Get Meal Plan Error:", error);
        res.status(500).json({ message: 'Gagal mengambil rencana makan' });
    }
};

function calculatePlanScore(currentMacros, targetMacros) {
    // Menghitung % perbedaan untuk setiap makro. 1.0 = 100% error.
    const calError = Math.abs((currentMacros.calories - targetMacros.targetCalories) / (targetMacros.targetCalories || 1));
    const protError = Math.abs((currentMacros.proteins - targetMacros.targetProteins) / (targetMacros.targetProteins || 1));
    const carbError = Math.abs((currentMacros.carbs - targetMacros.targetCarbs) / (targetMacros.targetCarbs || 1));
    const fatError = Math.abs((currentMacros.fats - targetMacros.targetFats) / (targetMacros.targetFats || 1));

    // Menjumlahkan error. Kalori diberi bobot 2x lebih penting.
    return (calError * 2) + protError + carbError + fatError;
}
/**
 * Fungsi algoritma cerdas (Randomized Best-of-N).
 * Mencoba N kombinasi acak dan memilih yang terbaik.
 */
function generateSmartDailyPlan(dailyTargets, availableFoods) {
    let bestPlan = { breakfast: null, lunch: null, dinner: null };
    let bestScore = Infinity;

    // Pisahkan makanan berdasarkan kategori agar lebih masuk akal
    // Anda bisa menyesuaikan kategori ini
    const breakfastFoods = availableFoods.filter(f => 
        ['Karbohidrat', 'Buah', 'Susu & Olahan', 'Snack', 'Protein Nabati', 'Protein Hewani'].includes(f.category)
    );
    const mainFoods = availableFoods.filter(f => 
        ['Protein Hewani', 'Protein Nabati', 'Sayuran', 'Karbohidrat'].includes(f.category)
    );

    // Pastikan kita punya makanan di setiap kategori
    if (breakfastFoods.length === 0 || mainFoods.length === 0) {
        // Fallback ke makanan acak jika kategori tidak mencukupi
        breakfastFoods.push(...availableFoods);
        mainFoods.push(...availableFoods);
    }

    const getRandomFood = (foodList) => foodList[Math.floor(Math.random() * foodList.length)];

    // Coba 100 kombinasi acak untuk menemukan yang terbaik
    for (let i = 0; i < 100; i++) {
        const breakfast = getRandomFood(breakfastFoods);
        const lunch = getRandomFood(mainFoods);
        const dinner = getRandomFood(mainFoods);

        // Jangan gunakan makanan yang sama untuk makan siang dan malam
        if (lunch._id === dinner._id) continue; 

        const currentMacros = {
            calories: breakfast.calories + lunch.calories + dinner.calories,
            proteins: breakfast.proteins + lunch.proteins + dinner.proteins,
            carbs: breakfast.carbs + lunch.carbs + dinner.carbs,
            fats: breakfast.fats + lunch.fats + dinner.fats,
        };

        const currentScore = calculatePlanScore(currentMacros, dailyTargets);

        if (currentScore < bestScore) {
            bestScore = currentScore;
            bestPlan = { breakfast, lunch, dinner };
        }
    }

    // Jika setelah 100x tetap tidak menemukan, setidaknya kembalikan sesuatu
    if (!bestPlan.breakfast) {
        bestPlan = {
            breakfast: getRandomFood(availableFoods),
            lunch: getRandomFood(availableFoods),
            dinner: getRandomFood(availableFoods)
        };
    }

    return bestPlan;
}
exports.generateMealPlan = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { period, startDate, endDate } = req.body;

        // 1. Ambil Profil User
        const user = await User.findById(userId).select('profile email');
        if (!user || !user.profile) {
            return res.status(404).json({ message: "Profil pengguna tidak ditemukan. (Pastikan kuesioner sudah diisi)" });
        }

        const profile = user.profile;
        const { 
            targetCalories, targetProteins, targetCarbs, targetFats,
            dietaryRestrictions, allergies 
        } = profile;
        
        // 2. Validasi Target Kalori
        if (!targetCalories) {
             return res.status(400).json({ message: "Target kalori Anda belum diatur di profil." });
        }
        
        const dailyTargets = { targetCalories, targetProteins, targetCarbs, targetFats };

        // 3. Buat Filter Query berdasarkan Pengecualian
        const queryFilter = {};
        if (allergies && allergies.length > 0) {
            queryFilter.allergens = { $nin: allergies };
        }
        if (dietaryRestrictions && dietaryRestrictions.length > 0) {
            queryFilter.dietaryTags = { $all: dietaryRestrictions };
        }
        
        // 4. Ambil Makanan yang Sesuai Filter dari Database
        const availableFoods = await Food.find(queryFilter);
        if (availableFoods.length < 3) { // Butuh setidaknya 3 makanan berbeda
            return res.status(400).json({ 
                message: "Tidak cukup makanan di database yang cocok dengan pantangan dan alergi Anda." 
            });
        }
        
        // 5. Tentukan Tanggal yang Akan di-Generate
        const datesToGenerate = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set ke awal hari

        if (period === 'today') {
            datesToGenerate.push(today.toISOString().split('T')[0]);
        } else if (period === '3_days') {
            for (let i = 0; i < 3; i++) {
                let date = new Date(today);
                date.setDate(date.getDate() + i);
                datesToGenerate.push(date.toISOString().split('T')[0]);
            }
        } else if (period === '1_week') {
             for (let i = 0; i < 7; i++) {
                let date = new Date(today);
                date.setDate(date.getDate() + i);
                datesToGenerate.push(date.toISOString().split('T')[0]);
            }
        } else if (period === 'custom' && startDate && endDate) {
            // --- LOGIKA UNTUK RENTANG TANGGAL CUSTOM ---
            let currentDate = new Date(startDate);
            currentDate.setHours(0, 0, 0, 0);
            const lastDate = new Date(endDate);
            lastDate.setHours(0, 0, 0, 0);

            if (currentDate > lastDate) {
                 return res.status(400).json({ message: "Tanggal akhir tidak boleh sebelum tanggal mulai." });
            }

            while (currentDate <= lastDate) {
                datesToGenerate.push(currentDate.toISOString().split('T')[0]);
                currentDate.setDate(currentDate.getDate() + 1);
            }
            // Batasi agar tidak berlebihan (misal: 30 hari)
            if (datesToGenerate.length > 30) {
                 return res.status(400).json({ message: "Rentang tanggal kustom tidak boleh lebih dari 30 hari." });
            }
        }

        if (datesToGenerate.length === 0) {
            return res.status(400).json({ message: "Periode tidak valid atau rentang tanggal kustom tidak diisi." });
        }

        // 6. Hapus Rencana Lama (jika ada) untuk tanggal tersebut
        await MealPlan.deleteMany({ 
            userId: userId, 
            date: { $in: datesToGenerate } 
        });

        // 7. Buat Rencana Baru untuk Setiap Tanggal
        let newPlans = [];
        for (const date of datesToGenerate) {
            // Panggil algoritma cerdas untuk setiap hari
            const plan = generateSmartDailyPlan(dailyTargets, availableFoods);
            
            newPlans.push(
                { userId, date, mealType: 'Sarapan', food: plan.breakfast._id, time: '08:00' },
                { userId, date, mealType: 'Makan Siang', food: plan.lunch._id, time: '12:00' },
                { userId, date, mealType: 'Makan Malam', food: plan.dinner._id, time: '19:00' }
            );
        }
        
        // 8. Simpan Rencana Makan Baru ke Database
        await MealPlan.insertMany(newPlans);

        res.status(201).json({ 
            message: `Rencana makan untuk ${datesToGenerate.length} hari berhasil dibuat!` 
        });

    } catch (error) {
        console.error("Generate Meal Plan Server Error:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server saat membuat rencana makan' });
    }
};