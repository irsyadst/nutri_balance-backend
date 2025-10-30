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
 * [PERBAIKAN]: Sekarang mengembalikan array makanan untuk setiap porsi.
 */
function generateSmartDailyPlan(dailyTargets, availableFoods) {
    let bestPlan = { breakfast: [], lunch: [], dinner: [] }; // <-- Diubah menjadi array
    let bestScore = Infinity;

    // --- (Logika pemisahan kategori Anda sudah benar) ---
    const proteins = availableFoods.filter(f => ['Protein Hewani', 'Protein Nabati'].includes(f.category));
    const carbs = availableFoods.filter(f => ['Karbohidrat'].includes(f.category));
    const veggies = availableFoods.filter(f => ['Sayuran'].includes(f.category));
    const fruits = availableFoods.filter(f => ['Buah'].includes(f.category));
    const dairySnacks = availableFoods.filter(f => ['Susu & Olahan', 'Snack'].includes(f.category));

    // --- (Fallback Anda sudah benar) ---
    if (proteins.length === 0) proteins.push(...availableFoods.filter(f => f.proteins > 5));
    if (carbs.length === 0) carbs.push(...availableFoods.filter(f => f.carbs > 10));
    if (veggies.length === 0) veggies.push(...availableFoods.filter(f => f.category === 'Buah' || f.calories < 100));
    if (fruits.length === 0) fruits.push(...availableFoods.filter(f => f.category === 'Buah' || f.calories < 150));
    if (dairySnacks.length === 0) dairySnacks.push(...availableFoods.filter(f => f.category === 'Snack' || f.calories < 200));

    if (proteins.length === 0 || carbs.length === 0 || veggies.length === 0) {
        console.error("[Generate] Data primer (protein/karbo/sayur) tidak cukup. Fallback.");
        const fallbackFood = availableFoods[Math.floor(Math.random() * availableFoods.length)];
        return { breakfast: [fallbackFood], lunch: [fallbackFood], dinner: [fallbackFood] };
    }
    // --------------------------------------------------------

    const getRandomFood = (foodList) => foodList[Math.floor(Math.random() * foodList.length)];

    for (let i = 0; i < 200; i++) {
        // Sarapan: 1 Karbo + 1 Buah/Susu
        const breakfastItems = [
            getRandomFood(carbs),
            getRandomFood(fruits.length > 0 ? fruits : dairySnacks)
        ];
        
        // Makan Siang: 1 Protein + 1 Karbo + 1 Sayur
        const lunchItems = [
            getRandomFood(proteins),
            getRandomFood(carbs),
            getRandomFood(veggies)
        ];

        // Makan Malam: 1 Protein + 1 Karbo + 1 Sayur
        const dinnerItems = [
            getRandomFood(proteins),
            getRandomFood(carbs),
            getRandomFood(veggies)
        ];

        // Gabungkan rencana (total 8 item)
        const currentPlanItems = [...breakfastItems, ...lunchItems, ...dinnerItems];

        // Hitung total makro dari SEMUA item
        const currentMacros = { calories: 0, proteins: 0, carbs: 0, fats: 0 };
        currentPlanItems.forEach(item => {
            if (item) { 
                currentMacros.calories += item.calories;
                currentMacros.proteins += item.proteins;
                currentMacros.carbs += item.carbs;
                currentMacros.fats += item.fats;
            }
        });

        const currentScore = calculatePlanScore(currentMacros, dailyTargets);

        if (currentScore < bestScore) {
            bestScore = currentScore;
            // --- PERBAIKAN PENYIMPANAN ---
            // Simpan array itemnya, bukan objek "piring" baru
            bestPlan = { 
                breakfast: breakfastItems,
                lunch: lunchItems,
                dinner: dinnerItems
            };
            // -----------------------------
        }
    }

    // Fallback jika tidak ditemukan (seharusnya tidak terjadi)
    if (bestPlan.breakfast.length === 0) {
        bestPlan = {
            breakfast: [getRandomFood(availableFoods)],
            lunch: [getRandomFood(availableFoods)],
            dinner: [getRandomFood(availableFoods)]
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

        // 3. Buat Filter Query
        const queryFilter = {};
        if (allergies && allergies.length > 0) {
            queryFilter.allergens = { $nin: allergies };
        }
        if (dietaryRestrictions && dietaryRestrictions.length > 0) {
            queryFilter.dietaryTags = { $all: dietaryRestrictions };
        }
        
        // 4. Ambil Makanan yang Sesuai Filter
        const availableFoods = await Food.find(queryFilter);
        if (availableFoods.length < 5) { // Kita butuh lebih banyak variasi sekarang
            return res.status(400).json({ 
                message: "Tidak cukup makanan di database yang cocok dengan pantangan dan alergi Anda." 
            });
        }
        
        // 5. Tentukan Tanggal
        const datesToGenerate = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0); 

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
            if (datesToGenerate.length > 30) {
                 return res.status(400).json({ message: "Rentang tanggal kustom tidak boleh lebih dari 30 hari." });
            }
        }

        if (datesToGenerate.length === 0) {
            return res.status(400).json({ message: "Periode tidak valid atau rentang tanggal kustom tidak diisi." });
        }

        // 6. Hapus Rencana Lama
        await MealPlan.deleteMany({ 
            userId: userId, 
            date: { $in: datesToGenerate } 
        });

        // 7. Buat Rencana Baru untuk Setiap Tanggal
        let newPlans = [];
        for (const date of datesToGenerate) {
            // Panggil algoritma cerdas
            const plan = generateSmartDailyPlan(dailyTargets, availableFoods);
            
            // --- PERBAIKAN LOGIKA PENYIMPANAN ---
            // Loop untuk Sarapan (2 item)
            plan.breakfast.forEach(food => {
                if (food) newPlans.push({ userId, date, mealType: 'Sarapan', food: food._id, time: '08:00' });
            });
            // Loop untuk Makan Siang (3 item)
            plan.lunch.forEach(food => {
                if (food) newPlans.push({ userId, date, mealType: 'Makan Siang', food: food._id, time: '12:00' });
            });
            // Loop untuk Makan Malam (3 item)
            plan.dinner.forEach(food => {
                if (food) newPlans.push({ userId, date, mealType: 'Makan Malam', food: food._id, time: '19:00' });
            });
            // --------------------------------------
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

