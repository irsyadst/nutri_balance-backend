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
        const { period, startDate, endDate } = req.body; // 'period' akan berisi 'today'

        console.log(`[Generate] Diminta oleh user ID: ${userId} untuk periode: ${period}`);

        // --- PERBAIKAN ---
        // Kita paksa query untuk mengambil 'profile' dan 'email' (untuk logging)
        // Ini akan menyelesaikan masalah "Profil tidak ditemukan"
        const user = await User.findById(userId).select('profile email');

        // 1. Validasi User
        if (!user) {
            console.error('[Generate] ERROR: User TIDAK DITEMUKAN dengan ID tersebut.');
            return res.status(404).json({ message: "User tidak ditemukan di database." });
        }

        console.log(`[Generate] User ditemukan: ${user.email}`);
        
        // Log untuk melihat apa yang didapat dari DB
        console.log('[Generate] Mengecek user.profile...', user.profile); 
        
        // 2. Validasi Profil
        if (!user.profile) {
            console.error('[Generate] ERROR: User ditemukan, TAPI user.profile null atau undefined.');
            return res.status(404).json({ message: "Profil pengguna tidak ditemukan. (Pastikan kuesioner sudah diisi)" });
        }

        const profile = user.profile;
        const { 
            targetCalories, targetProteins, targetCarbs, targetFats,
            dietaryRestrictions, allergies 
        } = profile;
        
        // 3. Validasi Target Kalori
        if (!targetCalories) {
             console.error('[Generate] ERROR: Profile ada, TAPI targetCalories (null/0).');
             return res.status(400).json({ message: "Target kalori Anda belum diatur di profil." });
        }
        console.log(`[Generate] Target Kalori: ${targetCalories} | Alergi: ${allergies} | Restriksi: ${dietaryRestrictions}`);


        // 4. Buat Filter Query berdasarkan Pengecualian
        const queryFilter = {};

        if (allergies && allergies.length > 0) {
            // $nin = "not in". Mengecualikan makanan yang punya alergen ini.
            // Contoh: akan mengecualikan makanan dengan "Susu" atau "Kedelai"
            queryFilter.allergens = { $nin: allergies };
        }

        if (dietaryRestrictions && dietaryRestrictions.length > 0) {
            // $all = "all". Memastikan makanan memiliki SEMUA tag diet ini.
            // Contoh: akan mencari makanan yang punya tag "Vegetarian" DAN "Halal"
            queryFilter.dietaryTags = { $all: dietaryRestrictions };
        }
        
        // 5. Ambil Makanan yang Sesuai Filter dari Database
        const availableFoods = await Food.find(queryFilter);

        if (availableFoods.length === 0) {
            console.error('[Generate] ERROR: Database tidak memiliki makanan yang cocok dengan filter.');
            return res.status(400).json({ 
                message: "Tidak ada makanan di database yang cocok dengan pantangan dan alergi Anda. Coba perbarui data makanan Anda." 
            });
        }
        console.log(`[Generate] Ditemukan ${availableFoods.length} makanan yang cocok.`);

        
        // 6. Tentukan Tanggal yang Akan di-Generate
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
        }
        // (Tambahkan 'custom' jika perlu, menggunakan startDate dan endDate)

        if (datesToGenerate.length === 0) {
            return res.status(400).json({ message: "Periode tidak valid." });
        }

        // 7. Hapus Rencana Lama (jika ada) untuk tanggal tersebut
        await MealPlan.deleteMany({ 
            userId: userId, 
            date: { $in: datesToGenerate } 
        });

        // 8. Logika Generator (Contoh Sederhana: Memilih Acak)
        // TODO: Ganti ini dengan algoritma yang lebih cerdas untuk mencocokkan makro.
        const findRandomFood = () => availableFoods[Math.floor(Math.random() * availableFoods.length)];
        
        let newPlans = [];
        for (const date of datesToGenerate) {
            newPlans.push(
                { userId, date, mealType: 'Sarapan', food: findRandomFood(), time: '08:00' },
                { userId, date, mealType: 'Makan Siang', food: findRandomFood(), time: '12:00' },
                { userId, date, mealType: 'Makan Malam', food: findRandomFood(), time: '19:00' }
            );
        }
        
        // 9. Simpan Rencana Makan Baru ke Database
        await MealPlan.insertMany(newPlans);

        console.log(`[Generate] Berhasil! ${newPlans.length} item menu dibuat untuk user ${user.email}.`);
        res.status(201).json({ 
            message: `Rencana makan untuk ${datesToGenerate.length} hari berhasil dibuat!` 
        });

    } catch (error) {
        console.error("Generate Meal Plan Server Error:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server saat membuat rencana makan' });
    }
};