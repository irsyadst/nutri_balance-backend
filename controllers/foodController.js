const FoodLog = require('../models/foodLogModel');
const MealPlan = require('../models/mealPlanModel');
const Food = require('../models/foodModel');
const User = require('../models/userModel');
const Notification = require('../models/notificationModel');

const processFoodEntry = (entry) => {
    const foodData = entry.food;
    
    const multiplier = entry.quantity || 1;
    const baseQuantity = foodData?.servingQuantity || 1;
    const baseUnit = foodData?.servingUnit || 'porsi';

    const finalQuantity = multiplier * baseQuantity;

    return {
        ...entry,
        displayQuantity: finalQuantity,
        displayUnit: baseUnit
    };
};

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

        if (category) {
            query.category = category;
        }

        if (search) {
            query.name = new RegExp(search, 'i');
        }
        
        const results = await Food.find(query).limit(50);
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: 'Gagal mencari makanan' });
    }
};
exports.logFood = async (req, res) => {
    try {
        const { foodId, quantity, mealType, date } = req.body;

        const food = await Food.findById(foodId);
        if (!food) return res.status(404).json({ message: 'Makanan tidak ditemukan' });

        const logDate = date || new Date().toISOString().split('T')[0];

        const foodDataForLog = {
            id: food._id.toString(),
            name: food.name,
            calories: food.calories,
            proteins: food.proteins,
            carbs: food.carbs,
            fats: food.fats,
            category: food.category,
            servingQuantity: food.servingQuantity,
            servingUnit: food.servingUnit
        };

        const logEntry = new FoodLog({ 
            userId: req.user.userId, 
            date: logDate, 
            food: foodDataForLog,
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

exports.getHistory = async (req, res) => {
    try {
        const userLogs = await FoodLog.find({ userId: req.user.userId })
            .sort({ createdAt: -1 })
            .lean(); 

        const processedLogs = userLogs.map(processFoodEntry);

        res.json(processedLogs);

    } catch (error) {
        console.error("Get History Error:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
};

exports.getMealPlan = async (req, res) => {
    try {
        const { date } = req.query; 

        if (!date) {
            return res.status(400).json({ message: 'Query tanggal diperlukan.' });
        }

        const plans = await MealPlan.find({
            userId: req.user.userId,
            date: date
        })
        .populate('food')
        .lean();

        const processedPlans = plans.map(processFoodEntry);

        res.json(processedPlans);
        
    } catch (error) {
        console.error("Get Meal Plan Error:", error);
        res.status(500).json({ message: 'Gagal mengambil rencana makan' });
    }
};

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
    let bestPlan = { breakfast: [], lunch: [], dinner: [], snack: [] };
    let bestScore = Infinity;

    const proteins = availableFoods.filter(f => ['Protein Hewani', 'Protein Nabati'].includes(f.category));
    const carbs = availableFoods.filter(f => ['Karbohidrat'].includes(f.category));
    const veggies = availableFoods.filter(f => ['Sayuran'].includes(f.category));
    const fruits = availableFoods.filter(f => ['Buah'].includes(f.category));
    const dairySnacks = availableFoods.filter(f => ['Susu & Olahan', 'Snack'].includes(f.category));

    if (proteins.length === 0) proteins.push(...availableFoods.filter(f => f.proteins > 5));
    if (carbs.length === 0) carbs.push(...availableFoods.filter(f => f.carbs > 10));
    if (veggies.length === 0) veggies.push(...availableFoods.filter(f => f.category === 'Buah' || f.calories < 100));
    if (fruits.length === 0) fruits.push(...availableFoods.filter(f => f.category === 'Buah' || f.calories < 150));
    if (dairySnacks.length === 0) dairySnacks.push(...availableFoods.filter(f => f.category === 'Snack' || (f.calories > 50 && f.calories < 250)));

    const emergencyFood = availableFoods[0]; 

    const getRandomFood = (foodList) => {
        if (foodList && foodList.length > 0) {
            return foodList[Math.floor(Math.random() * foodList.length)];
        }
        return emergencyFood; 
    };

    for (let i = 0; i < 200; i++) {
        const breakfastMain = getRandomFood(carbs);
        const breakfastSide = getRandomFood(fruits.length > 0 ? fruits : dairySnacks);
        
        const lunchMainProtein = getRandomFood(proteins);
        const lunchMainCarb = getRandomFood(carbs);
        const lunchSide = getRandomFood(veggies);
        
        const dinnerMainProtein = getRandomFood(proteins);
        const dinnerMainCarb = getRandomFood(carbs);
        const dinnerSide = getRandomFood(veggies);

        const snackItem1 = getRandomFood(dairySnacks.length > 0 ? dairySnacks : fruits);
        
        const mainItems = [breakfastMain, lunchMainProtein, lunchMainCarb, dinnerMainProtein, dinnerMainCarb];
        const sideItems = [breakfastSide, lunchSide, dinnerSide, snackItem1];

        let sideCalories = 0;
        sideItems.forEach(item => { if (item) sideCalories += item.calories; });

        let unscaledMainCalories = 0;
        mainItems.forEach(item => { if (item) unscaledMainCalories += item.calories; });

        if (unscaledMainCalories === 0) continue; 

        const mainTargetCalories = dailyTargets.targetCalories - sideCalories;

        let scaledQty = mainTargetCalories / unscaledMainCalories;
        scaledQty = Math.max(0.5, Math.min(scaledQty, 4.0)); 

        const scaledMacros = { calories: 0, proteins: 0, carbs: 0, fats: 0 };
        const applyMacros = (item, qty) => {
            if (item) {
                scaledMacros.calories += item.calories * qty;
                scaledMacros.proteins += item.proteins * qty;
                scaledMacros.carbs += item.carbs * qty;
                scaledMacros.fats += item.fats * qty;
            }
        };

        mainItems.forEach(item => applyMacros(item, scaledQty));
        sideItems.forEach(item => applyMacros(item, 1.0));

        const currentScore = calculatePlanScore(scaledMacros, dailyTargets);

        if (currentScore < bestScore) {
            bestScore = currentScore;
            const finalQty = Math.round(scaledQty * 2) / 2; 

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
                ],
                snack: [
                    { food: snackItem1, qty: 1.0 }
                ]
            };
        }
    }

    return bestPlan;
}

exports.generateMealPlan = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { period, startDate, endDate } = req.body;

        const user = await User.findById(userId).select('profile email');
        if (!user || !user.profile) {
            return res.status(404).json({ message: "Profil pengguna tidak ditemukan. (Pastikan kuesioner sudah diisi)" });
        }

        const profile = user.profile;
        const {
            targetCalories, targetProteins, targetCarbs, targetFats,
            dietaryRestrictions, allergies
        } = profile;

        if (!targetCalories) {
            return res.status(400).json({ message: "Target kalori Anda belum diatur di profil." });
        }

        const dailyTargets = { targetCalories, targetProteins, targetCarbs, targetFats };

        const queryFilter = {};
        if (allergies && allergies.length > 0) {
            queryFilter.allergens = { $nin: allergies };
        }
        if (dietaryRestrictions && dietaryRestrictions.length > 0) {
            queryFilter.dietaryTags = { $all: dietaryRestrictions };
        }

        const availableFoods = await Food.find(queryFilter);
        

        if (availableFoods.length === 0) { 
            return res.status(400).json({
                message: "Tidak ada satupun makanan di database yang cocok dengan pantangan dan alergi Anda."
            });
        }

        const datesToGenerate = [];
        const today = new Date(
            new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
        );
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
            
            let count = 0;
            while (currentDate <= lastDate && count < 31) {
                datesToGenerate.push(currentDate.toISOString().split('T')[0]);
                currentDate.setDate(currentDate.getDate() + 1);
                count++;
            }
            if (count >= 31) { 
                 console.warn("Generate Meal Plan: Rentang kustom melebihi 30 hari, dibatasi.");
            }
        }

        if (datesToGenerate.length === 0) {
            return res.status(400).json({ message: "Periode tidak valid atau rentang tanggal kustom tidak diisi." });
        }

        await MealPlan.deleteMany({
            userId: userId,
            date: { $in: datesToGenerate }
        });

        let newPlans = [];
        for (const date of datesToGenerate) {
            const plan = generateSmartDailyPlan(dailyTargets, availableFoods);

            plan.breakfast.forEach(item => {
                if (item.food) newPlans.push({ userId, date, mealType: 'Sarapan', food: item.food._id, quantity: item.qty, time: '08:00' });
            });
            plan.lunch.forEach(item => {
                if (item.food) newPlans.push({ userId, date, mealType: 'Makan Siang', food: item.food._id, quantity: item.qty, time: '12:00' });
            });
            plan.dinner.forEach(item => {
                if (item.food) newPlans.push({ userId, date, mealType: 'Makan Malam', food: item.food._id, quantity: item.qty, time: '19:00' });
            });
            plan.snack.forEach(item => {
                if (item.food) newPlans.push({ userId, date, mealType: 'Snack', food: item.food._id, quantity: item.qty, time: '15:00' });
            });
        }
        
        await MealPlan.insertMany(newPlans);
         try {
            await Notification.create({
                userId: userId,
                title: 'Rencana Makan Telah Dibuat!',
                body: `Rencana makan Anda untuk ${datesToGenerate.length} hari telah berhasil dibuat.`,
                iconAsset: 'trophy',
            });
        } catch (notifError) {
            console.error("Gagal membuat notifikasi:", notifError);
        }

        res.status(201).json({
            message: `Rencana makan untuk ${datesToGenerate.length} hari berhasil dibuat!`
        });

    } catch (error) {
        console.error("Generate Meal Plan Server Error:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server saat membuat rencana makan' });
    }
};