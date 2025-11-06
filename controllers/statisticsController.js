// controllers/statisticsController.js
const asyncHandler = require('express-async-handler');
const FoodLog = require('../models/foodLogModel');
const mongoose = require('mongoose');

// Helper untuk mendapatkan tanggal YYYY-MM-DD
const getFormattedDate = (date) => {
  return date.toISOString().split('T')[0];
};

// Helper untuk menghitung statistik agregat
const getAggregatedStats = async (userId, dateString) => {
  const stats = await FoodLog.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: dateString,
      },
    },
    {
      // Hitung total nutrisi per entri (nutrisi * kuantitas)
      $project: {
        mealType: 1,
        calories: { $multiply: ['$food.calories', '$quantity'] },
        proteins: { $multiply: ['$food.proteins', '$quantity'] },
        carbs: { $multiply: ['$food.carbs', '$quantity'] },
        fats: { $multiply: ['$food.fats', '$quantity'] },
      },
    },
    {
      // Kelompokkan berdasarkan mealType
      $group: {
        _id: '$mealType',
        totalCalories: { $sum: '$calories' },
        totalProteins: { $sum: '$proteins' },
        totalCarbs: { $sum: '$carbs' },
        totalFats: { $sum: '$fats' },
      },
    },
    {
      // Kelompokkan semua mealType menjadi satu dokumen
      $group: {
        _id: null,
        totalCalories: { $sum: '$totalCalories' },
        totalProteins: { $sum: '$totalProteins' },
        totalCarbs: { $sum: '$totalCarbs' },
        totalFats: { $sum: '$totalFats' },
        // Simpan rincian per mealType
        caloriesPerMeal: {
          $push: {
            k: '$_id',
            v: '$totalCalories',
          },
        },
      },
    },
    {
      // Ubah array caloriesPerMeal menjadi object (Map)
      $project: {
        _id: 0,
        totalCalories: 1,
        totalProteins: 1,
        totalCarbs: 1,
        totalFats: 1,
        caloriesPerMeal: { $arrayToObject: '$caloriesPerMeal' },
      },
    },
  ]);

  // Jika tidak ada data, kembalikan object default
  if (stats.length === 0) {
    return {
      totalCalories: 0,
      totalProteins: 0,
      totalCarbs: 0,
      totalFats: 0,
      caloriesPerMeal: {},
    };
  }
  return stats[0];
};

// @desc    Get statistics summary for a given date
// @route   GET /api/statistics/summary
// @access  Private
const getStatisticsSummary = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  
  // Dapatkan tanggal dari query, default ke hari ini
  const dateQuery = req.query.date || getFormattedDate(new Date());
  
  // Hitung tanggal kemarin
  const today = new Date(dateQuery);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayQuery = getFormattedDate(yesterday);

  // Dapatkan statistik hari ini dan kemarin
  const todayStats = await getAggregatedStats(userId, dateQuery);
  const yesterdayStats = await getAggregatedStats(userId, yesterdayQuery);

  // --- Hitung Persentase Perubahan ---
  const calcPercentChange = (today, yesterday) => {
    if (yesterday === 0 || yesterday === null) return 0; // Hindari pembagian dengan nol
    if (today === yesterday) return 0;
    return ((today - yesterday) / yesterday) * 100;
  };

  const calorieChangePercent = calcPercentChange(todayStats.totalCalories, yesterdayStats.totalCalories);

  // --- Hitung Rasio Makro ---
  const totalMacros = todayStats.totalProteins + todayStats.totalCarbs + todayStats.totalFats;
  let macroPercentages, macroRatio;

  if (totalMacros === 0) {
    macroPercentages = { 'Karbohidrat': 0, 'Protein': 0, 'Lemak': 0 };
    macroRatio = "0/0/0";
  } else {
    const carbPercent = (todayStats.totalCarbs * 4) / (todayStats.totalCalories || 1) * 100; // 1g Karbo = 4 Kkal
    const protPercent = (todayStats.totalProteins * 4) / (todayStats.totalCalories || 1) * 100; // 1g Prot = 4 Kkal
    const fatPercent = (todayStats.totalFats * 9) / (todayStats.totalCalories || 1) * 100; // 1g Lemak = 9 Kkal

    macroPercentages = {
      'Karbohidrat': carbPercent,
      'Protein': protPercent,
      'Lemak': fatPercent,
    };
    macroRatio = `${carbPercent.toFixed(0)}/${protPercent.toFixed(0)}/${fatPercent.toFixed(0)}`;
  }
  
  // Hitung total makro kemarin untuk persentase perubahan makro
  const yesterdayTotalMacros = yesterdayStats.totalProteins + yesterdayStats.totalCarbs + yesterdayStats.totalFats;
  const macroChangePercent = calcPercentChange(totalMacros, yesterdayTotalMacros);

  res.json({
    caloriesToday: todayStats.totalCalories,
    calorieChangePercent: calorieChangePercent,
    macroRatio: macroRatio,
    macroChangePercent: macroChangePercent,
    calorieDataPerMeal: todayStats.caloriesPerMeal,
    macroDataPercentage: macroPercentages,
  });
});

module.exports = {
  getStatisticsSummary,
};