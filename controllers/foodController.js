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

// --- [PERBAIKAN 1: Bug logFood] ---
// Memperbaiki bug di mana 'foodDatabase' digunakan alih-alih mengambil
// data dari model 'Food' dan menyesuaikan format data untuk 'FoodLog'.
exports.logFood = async (req, res) => {
    try {
        // Ambil 'date' juga dari body, agar pengguna bisa log untuk hari kemarin
        const { foodId, quantity, mealType, date } = req.body;

        // PERBAIKAN: Cari makanan di database MongoDB
        const food = await Food.findById(foodId);
        if (!food) return res.status(404).json({ message: 'Makanan tidak ditemukan' });

        // Gunakan tanggal dari client, atau default ke hari ini
        const logDate = date || new Date().toISOString().split('T')[0];

        // PERBAIKAN: Buat objek food yang sesuai dengan foodLogModel
        const foodDataForLog = {
            id: food._id.toString(),
            name: food.name,
            calories: food.calories,
            proteins: food.proteins,
            carbs: food.carbs,
            fats: food.fats,
            category: food.category
        };

        const logEntry = new FoodLog({ 
            userId: req.user.userId, 
            date: logDate, 
            food: foodDataForLog, // Gunakan objek yang sudah disiapkan
            quantity, 
            mealType 
        });
        
        await logEntry.save();
        res.status(201).json({ message: 'Makanan berhasil dicatat', log: logEntry });
    } catch (error) {
        console.error("Log Food Error:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
};
// --- [AKHIR PERBAIKAN 1] ---

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

// GANTI FUNGSI LAMA ANDA DENGAN YANG INI
function calculatePlanScore(currentMacros, targetMacros) {
    const calorieDiff = currentMacros.calories - targetMacros.targetCalories;
    let calError;

    if (calorieDiff > 0) {

        calError = (calorieDiff / (targetMacros.targetCalories || 1)) * 10; 
    } else {
        calError = Math.abs(calorieDiff / (targetMacros.targetCalories || 1));
    }


    const protError = Math.abs((currentMacros.proteins - targetMacros.targetProteins) / (targetMacros.targetProteins || 1));
    const carbError = Math.abs((currentMacros.carbs - targetMacros.targetCarbs) / (targetMacros.targetCarbs || 1));
    const fatError = Math.abs((currentMacros.fats - targetMacros.targetFats) / (targetMacros.targetFats || 1));

    return (calError * 2) + protError + carbError + fatError;
}


function generateSmartDailyPlan(dailyTargets, availableFoods) {
    let bestPlan = { breakfast: [], lunch: [], dinner: [] };
    let bestScore = Infinity;

    // --- Pemisahan kategori ---
    const proteins = availableFoods.filter(f => ['Protein Hewani', 'Protein Nabati'].includes(f.category));
    const carbs = availableFoods.filter(f => ['Karbohidrat'].includes(f.category));
    const veggies = availableFoods.filter(f => ['Sayuran'].includes(f.category));
    const fruits = availableFoods.filter(f => ['Buah'].includes(f.category));
    const dairySnacks = availableFoods.filter(f => ['Susu & Olahan', 'Snack'].includes(f.category));

    // --- Fallback (Ini sudah OK) ---
    if (proteins.length === 0) proteins.push(...availableFoods.filter(f => f.proteins > 5));
    if (carbs.length === 0) carbs.push(...availableFoods.filter(f => f.carbs > 10));
    if (veggies.length === 0) veggies.push(...availableFoods.filter(f => f.category === 'Buah' || f.calories < 100));
    if (fruits.length === 0) fruits.push(...availableFoods.filter(f => f.category === 'Buah' || f.calories < 150));
    if (dairySnacks.length === 0) dairySnacks.push(...availableFoods.filter(f => f.category === 'Snack' || f.calories < 200));

    // Makanan 'darurat'. Karena kita sudah cek (length > 0) di 'generateMealPlan', ini dijamin aman.
    const emergencyFood = availableFoods[0]; 

    // --- Fungsi getRandomFood yang aman ---
    const getRandomFood = (foodList) => {
        if (foodList && foodList.length > 0) {
            return foodList[Math.floor(Math.random() * foodList.length)];
        }
        // Jika foodList kosong, kembalikan makanan darurat
        return emergencyFood; 
    };

    // Coba 200 kombinasi acak untuk menemukan yang terbaik
    for (let i = 0; i < 200; i++) {

        // --- 1. Pilih 8 item makanan (Dipisah Main & Side) ---
        const breakfastMain = getRandomFood(carbs);
        const breakfastSide = getRandomFood(fruits.length > 0 ? fruits : dairySnacks);
        
        const lunchMainProtein = getRandomFood(proteins);
        const lunchMainCarb = getRandomFood(carbs);
        const lunchSide = getRandomFood(veggies);
        
        const dinnerMainProtein = getRandomFood(proteins);
        const dinnerMainCarb = getRandomFood(carbs);
        const dinnerSide = getRandomFood(veggies);

        // Kumpulkan item utama dan sampingan
        const mainItems = [breakfastMain, lunchMainProtein, lunchMainCarb, dinnerMainProtein, dinnerMainCarb];
        const sideItems = [breakfastSide, lunchSide, dinnerSide];

        // --- 2. Hitung kalori sampingan (diasumsikan qty = 1.0) ---
        let sideCalories = 0;
        sideItems.forEach(item => { if (item) sideCalories += item.calories; });

        // --- 3. Hitung kalori item utama (saat qty = 1.0) ---
        let unscaledMainCalories = 0;
        mainItems.forEach(item => { if (item) unscaledMainCalories += item.calories; });

        if (unscaledMainCalories === 0) continue; // Hindari pembagian dengan nol

        // --- 4. Tentukan sisa kalori yang harus dipenuhi oleh item utama ---
        const mainTargetCalories = dailyTargets.targetCalories - sideCalories;

        // --- 5. Hitung 'quantity' (faktor skala) HANYA untuk item utama ---
        let scaledQty = mainTargetCalories / unscaledMainCalories;

        // Batasi quantity (0.5x s/d 4x)
        scaledQty = Math.max(0.5, Math.min(scaledQty, 4.0)); 

        // --- 6. Hitung ulang total makro DENGAN 'quantity' yang baru ---
        const scaledMacros = { calories: 0, proteins: 0, carbs: 0, fats: 0 };
        const applyMacros = (item, qty) => {
            if (item) {
                scaledMacros.calories += item.calories * qty;
                scaledMacros.proteins += item.proteins * qty;
                scaledMacros.carbs += item.carbs * qty;
                scaledMacros.fats += item.fats * qty;
            }
        };

        // Terapkan 'scaledQty' ke SEMUA item utama
        mainItems.forEach(item => applyMacros(item, scaledQty));
        
        // Terapkan '1.0' ke SEMUA item sampingan
        sideItems.forEach(item => applyMacros(item, 1.0));

        // --- 7. Hitung skor berdasarkan makro yang SUDAH DISESUAIKAN ---
        const currentScore = calculatePlanScore(scaledMacros, dailyTargets);

        if (currentScore < bestScore) {
            bestScore = currentScore;
            
            // Bulatkan quantity HANYA saat menyimpan rencana terbaik
            const finalQty = Math.round(scaledQty * 2) / 2; // Bulatkan ke 0.5 terdekat

            // --- 8. Simpan rencana terbaik (lengkap dengan 'food' dan 'qty'-nya) ---
            bestPlan = {
                breakfast: [
                    { food: breakfastMain, qty: finalQty },
                    { food: breakfastSide, qty: 1.0 }
                ],
                lunch: [
                    { food: lunchMainProtein, qty: finalQty },
                    { food: lunchMainCarb, qty: finalQty },
                    { food: lunchSide, qty: 1.0 }
                ],
                dinner: [
                    { food: dinnerMainProtein, qty: finalQty },
                    { food: dinnerMainCarb, qty: finalQty },
                    { food: dinnerSide, qty: 1.0 }
                ]
            };
        }
    }

    return bestPlan;
}
// --- [AKHIR PERBAIKAN 2] ---


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
        
        // --- [PERBAIKAN 3: Filter Tanggal] ---
        // Mengubah < 5 menjadi === 0. Selama ada 1 makanan, generator
        // harus tetap berjalan, ini memperbaiki error "Tidak cukup makanan".
        if (availableFoods.length === 0) { 
            return res.status(400).json({
                message: "Tidak ada satupun makanan di database yang cocok dengan pantangan dan alergi Anda."
            });
        }
        // --- [AKHIR PERBAIKAN 3] ---

        // 5. Tentukan Tanggal (LOGIKA INI SUDAH BENAR)
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
            let currentDate = new Date(startDate);
            currentDate.setHours(0, 0, 0, 0); // Normalisasi
            const lastDate = new Date(endDate);
            lastDate.setHours(0, 0, 0, 0); // Normalisasi

            if (currentDate > lastDate) {
                return res.status(400).json({ message: "Tanggal akhir tidak boleh sebelum tanggal mulai." });
            }
            
            // Batasi agar tidak overload, misal maks 31 hari
            let count = 0;
            while (currentDate <= lastDate && count < 31) {
                datesToGenerate.push(currentDate.toISOString().split('T')[0]);
                currentDate.setDate(currentDate.getDate() + 1);
                count++;
            }
            // Perbaikan kecil: Cek jika count MELEBIHI 30 (atau >= 31)
            if (count >= 31) { 
                 console.warn("Generate Meal Plan: Rentang kustom melebihi 30 hari, dibatasi.");
                 // Tidak perlu return error, cukup batasi saja (datesToGenerate sudah terisi 30 hari)
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
            // Panggil algoritma cerdas (yang sudah aman)
            const plan = generateSmartDailyPlan(dailyTargets, availableFoods);

            // Loop untuk Sarapan
            plan.breakfast.forEach(item => {
                if (item.food) newPlans.push({ userId, date, mealType: 'Sarapan', food: item.food._id, quantity: item.qty, time: '08:00' });
            });
            // Loop untuk Makan Siang
            plan.lunch.forEach(item => {
                if (item.food) newPlans.push({ userId, date, mealType: 'Makan Siang', food: item.food._id, quantity: item.qty, time: '12:00' });
            });
            // Loop untuk Makan Malam
            plan.dinner.forEach(item => {
                if (item.food) newPlans.push({ userId, date, mealType: 'Makan Malam', food: item.food._id, quantity: item.qty, time: '19:00' });
            });
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