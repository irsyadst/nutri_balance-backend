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
        date: { $gte: startDate, $lte: endDate }
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

// @desc    Get statistics summary for a given date and period
// @route   GET /api/statistics/summary
// @access  Private
const getStatisticsSummary = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const period = req.query.period || 'daily';

  // Tanggal akhir adalah 'date' dari query, atau hari ini
  const endDate = req.query.date ? new Date(req.query.date) : new Date();
  
  let daysInPeriod = 1;
  let prevDaysInPeriod = 1;
  
  let startDate = new Date(endDate);
  let prevStartDate = new Date(endDate);
  let prevEndDate = new Date(endDate);

  if (period === 'daily') {
    daysInPeriod = 1;
    prevDaysInPeriod = 1;
    // Periode saat ini: 'endDate' (misal: 6 Nov)
    startDate = new Date(endDate); 
    // Periode sebelumnya: 1 hari sebelum 'endDate' (misal: 5 Nov)
    prevEndDate.setDate(endDate.getDate() - 1);
    prevStartDate.setDate(endDate.getDate() - 1);
  } else if (period === 'weekly') {
    daysInPeriod = 7;
    prevDaysInPeriod = 7;
    // Periode saat ini: 7 hari terakhir (misal: 31 Okt - 6 Nov)
    startDate.setDate(endDate.getDate() - 6);
    // Periode sebelumnya: 7 hari sebelum itu (misal: 24 Okt - 30 Okt)
    prevEndDate.setDate(endDate.getDate() - 7);
    prevStartDate.setDate(endDate.getDate() - 13);
  } else if (period === 'monthly') {
    daysInPeriod = 30;
    prevDaysInPeriod = 30;
    // Periode saat ini: 30 hari terakhir
    startDate.setDate(endDate.getDate() - 29);
    // Periode sebelumnya: 30 hari sebelum itu
    prevEndDate.setDate(endDate.getDate() - 30);
    prevStartDate.setDate(endDate.getDate() - 59);
  }

  // Format tanggal untuk query MongoDB
  const startDateString = getFormattedDate(startDate);
  const endDateString = getFormattedDate(endDate);
  const prevStartDateString = getFormattedDate(prevStartDate);
  const prevEndDateString = getFormattedDate(prevEndDate);

  // Dapatkan statistik TOTAL untuk setiap rentang
  const currentTotalStats = await getAggregatedStats(userId, startDateString, endDateString);
  const previousTotalStats = await getAggregatedStats(userId, prevStartDateString, prevEndDateString);

  // Hitung RATA-RATA harian
  const currentStats = getAverageStats(currentTotalStats, daysInPeriod);
  const yesterdayStats = getAverageStats(previousTotalStats, prevDaysInPeriod);

  // --- Hitung Persentase Perubahan ---
  const calcPercentChange = (today, yesterday) => {
    if (yesterday === 0 || yesterday === null) return 0;
    if (today === yesterday) return 0;
    return ((today - yesterday) / yesterday) * 100;
  };

  const calorieChangePercent = calcPercentChange(todayStats.totalCalories, yesterdayStats.totalCalories);

  // --- Hitung Rasio Makro (berdasarkan rata-rata) ---
  const totalMacros = currentStats.totalProteins + currentStats.totalCarbs + currentStats.totalFats;
  let macroPercentages, macroRatio;

  if (totalMacros === 0 || currentStats.totalCalories === 0) {
    macroPercentages = { 'Karbohidrat': 0, 'Protein': 0, 'Lemak': 0 };
    macroRatio = "0/0/0";
  } else {
    // Hitung persentase kalori dari total kalori
    const carbPercent = (currentStats.totalCarbs * 4) / currentStats.totalCalories * 100;
    const protPercent = (currentStats.totalProteins * 4) / currentStats.totalCalories * 100;
    const fatPercent = (currentStats.totalFats * 9) / currentStats.totalCalories * 100;

    macroPercentages = {
      'Karbohidrat': carbPercent,
      'Protein': protPercent,
      'Lemak': fatPercent,
    };
    macroRatio = `${carbPercent.toFixed(0)}/${protPercent.toFixed(0)}/${fatPercent.toFixed(0)}`;
  }
  
  const yesterdayTotalMacros = yesterdayStats.totalProteins + yesterdayStats.totalCarbs + yesterdayStats.totalFats;
  const macroChangePercent = calcPercentChange(totalMacros, yesterdayTotalMacros);

  res.json({
    // Nama field tetap sama, tapi sekarang berisi RATA-RATA
    caloriesToday: currentStats.totalCalories, 
    calorieChangePercent: calorieChangePercent,
    macroRatio: macroRatio,
    macroChangePercent: macroChangePercent,
    calorieDataPerMeal: currentStats.caloriesPerMeal,
    macroDataPercentage: macroPercentages,
  });
});

module.exports = {
  getStatisticsSummary,
};