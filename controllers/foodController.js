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
/**
 * Fungsi algoritma cerdas (Randomized Best-of-N).
 * Mencoba N kombinasi acak dan memilih yang terbaik.
 */
function generateSmartDailyPlan(dailyTargets, availableFoods) {
    let bestPlan = { breakfast: null, lunch: null, dinner: null };
    let bestScore = Infinity;

    // --- PERBAIKAN LOGIKA: Pisahkan makanan berdasarkan komponen ---
    const proteins = availableFoods.filter(f => ['Protein Hewani', 'Protein Nabati'].includes(f.category));
    const carbs = availableFoods.filter(f => ['Karbohidrat'].includes(f.category));
    const veggies = availableFoods.filter(f => ['Sayuran'].includes(f.category));
    const fruits = availableFoods.filter(f => ['Buah'].includes(f.category));
    const dairySnacks = availableFoods.filter(f => ['Susu & Olahan', 'Snack'].includes(f.category));

    // --- Fallback jika ada kategori yang kosong ---
    if (proteins.length === 0) proteins.push(...availableFoods.filter(f => f.proteins > 5));
    if (carbs.length === 0) carbs.push(...availableFoods.filter(f => f.carbs > 10));
    if (veggies.length === 0) veggies.push(...availableFoods.filter(f => f.category === 'Buah' || f.calories < 100));
    if (fruits.length === 0) fruits.push(...availableFoods.filter(f => f.category === 'Buah' || f.calories < 150));
    if (dairySnacks.length === 0) dairySnacks.push(...availableFoods.filter(f => f.category === 'Snack' || f.calories < 200));

    // Pastikan kita punya setidaknya satu makanan di setiap kategori fallback
    if (proteins.length === 0 || carbs.length === 0 || veggies.length === 0 || fruits.length === 0 || dairySnacks.length === 0) {
        // Jika data sangat minim, kembali ke logika acak total
        console.error("[Generate] Data makanan tidak cukup untuk dibagi per kategori. Menggunakan fallback acak total.");
        const fallbackFood = availableFoods[Math.floor(Math.random() * availableFoods.length)];
        return { breakfast: fallbackFood, lunch: fallbackFood, dinner: fallbackFood };
    }
    // --------------------------------------------------------

    const getRandomFood = (foodList) => foodList[Math.floor(Math.random() * foodList.length)];

    // Coba 200 kombinasi acak untuk menemukan yang terbaik
    for (let i = 0; i < 200; i++) {
        
        // --- PERBAIKAN LOGIKA: Buat "Piring Makanan" ---
        // Sarapan: 1 Karbo + 1 Buah/Susu
        const breakfastCarb = getRandomFood(carbs);
        const breakfastSide = getRandomFood(fruits.length > 0 ? fruits : dairySnacks);
        
        // Makan Siang: 1 Protein + 1 Karbo + 1 Sayur
        const lunchProtein = getRandomFood(proteins);
        const lunchCarb = getRandomFood(carbs);
        const lunchVeggie = getRandomFood(veggies);

        // Makan Malam: 1 Protein + 1 Karbo + 1 Sayur
        const dinnerProtein = getRandomFood(proteins);
        const dinnerCarb = getRandomFood(carbs);
        const dinnerVeggie = getRandomFood(veggies);

        // Gabungkan rencana (ini adalah 8 item makanan, bukan 3)
        const currentPlanItems = [
            breakfastCarb, breakfastSide,
            lunchProtein, lunchCarb, lunchVeggie,
            dinnerProtein, dinnerCarb, dinnerVeggie
        ];

        // Hitung total makro dari SEMUA item
        const currentMacros = {
            calories: 0, proteins: 0, carbs: 0, fats: 0,
        };
        currentPlanItems.forEach(item => {
            if (item) { // Pastikan item tidak null
                currentMacros.calories += item.calories;
                currentMacros.proteins += item.proteins;
                currentMacros.carbs += item.carbs;
                currentMacros.fats += item.fats;
            }
        });

        // Hitung skornya
        const currentScore = calculatePlanScore(currentMacros, dailyTargets);

        if (currentScore < bestScore) {
            bestScore = currentScore;
            // Simpan rencana dalam format yang diharapkan oleh 'exports.generateMealPlan'
            // Kita akan gabungkan komponennya. Contoh: "Nasi dan Ayam Bakar"
            // NOTE: Ini hanya untuk contoh, kita tetap simpan ID-nya di langkah 7
            // Untuk sekarang, kita hanya perlu 3 makanan "utama" untuk disimpan.
            // Kita akan pilih komponen utama dari setiap piring.
            bestPlan = { 
                breakfast: breakfastCarb, // Makanan utama sarapan
                lunch: lunchProtein,      // Makanan utama makan siang
                dinner: dinnerProtein     // Makanan utama makan malam
            };
            
            // --- PERBAIKAN SEBENARNYA ADA DI SINI ---
            // Kita harus menyimpan SEMUA item, bukan hanya 3.
            // Ini membutuhkan perubahan pada `exports.generateMealPlan`
            // Mari kita sederhanakan: kita simpan 3 "piring"
            
            bestPlan = {
                // "piring" sarapan:
                breakfast: {
                    _id: breakfastCarb._id, // Simpan ID item utama
                    name: `${breakfastCarb.name} & ${breakfastSide.name}`,
                    calories: breakfastCarb.calories + breakfastSide.calories,
                    proteins: breakfastCarb.proteins + breakfastSide.proteins,
                    carbs: breakfastCarb.carbs + breakfastSide.carbs,
                    fats: breakfastCarb.fats + breakfastSide.fats,
                    category: 'Sarapan' // Kategori baru: Piring
                },
                // "piring" makan siang:
                lunch: {
                    _id: lunchProtein._id, // Simpan ID item utama
                    name: `${lunchProtein.name}, ${lunchCarb.name} & ${lunchVeggie.name}`,
                    calories: lunchProtein.calories + lunchCarb.calories + lunchVeggie.calories,
                    proteins: lunchProtein.proteins + lunchCarb.proteins + lunchVeggie.proteins,
                    carbs: lunchProtein.carbs + lunchCarb.carbs + lunchVeggie.carbs,
                    fats: lunchProtein.fats + lunchCarb.fats + lunchVeggie.fats,
                    category: 'Makan Siang'
                },
                // "piring" makan malam:
                dinner: {
                    _id: dinnerProtein._id,
                    name: `${dinnerProtein.name}, ${dinnerCarb.name} & ${dinnerVeggie.name}`,
                    calories: dinnerProtein.calories + dinnerCarb.calories + dinnerVeggie.calories,
                    proteins: dinnerProtein.proteins + dinnerCarb.proteins + dinnerVeggie.proteins,
                    carbs: dinnerProtein.carbs + dinnerCarb.carbs + dinnerVeggie.carbs,
                    fats: dinnerProtein.fats + dinnerCarb.fats + dinnerVeggie.fats,
                    category: 'Makan Malam'
                }
            };
            // ------------------------------------
        }
    }

    // Jika setelah 200x tetap tidak menemukan (seharusnya tidak terjadi jika ada fallback)
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