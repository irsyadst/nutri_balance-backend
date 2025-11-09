const asyncHandler = require('express-async-handler');
const FoodLog = require('../models/foodLogModel');
const mongoose = require('mongoose');

const getFormattedDate = (date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getAggregatedStats = async (userId, startDate, endDate) => {
  const stats = await FoodLog.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $project: {
        mealType: 1,
        calories: { $multiply: ['$food.calories', '$quantity'] },
        proteins: { $multiply: ['$food.proteins', '$quantity'] },
        carbs: { $multiply: ['$food.carbs', '$quantity'] },
        fats: { $multiply: ['$food.fats', '$quantity'] },
      },
    },
    {
      $group: {
        _id: '$mealType',
        totalCalories: { $sum: '$calories' },
        totalProteins: { $sum: '$proteins' },
        totalCarbs: { $sum: '$carbs' },
        totalFats: { $sum: '$fats' },
      },
    },
    {
      $group: {
        _id: null,
        totalCalories: { $sum: '$totalCalories' },
        totalProteins: { $sum: '$totalProteins' },
        totalCarbs: { $sum: '$totalCarbs' },
        totalFats: { $sum: '$totalFats' },
        caloriesPerMeal: {
          $push: { k: '$_id', v: '$totalCalories' },
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

const getAverageStats = (stats, days) => {
  if (days === 0) days = 1; 
  const avgStats = {
    totalCalories: (stats.totalCalories || 0) / days,
    totalProteins: (stats.totalProteins || 0) / days,
    totalCarbs: (stats.totalCarbs || 0) / days,
    totalFats: (stats.totalFats || 0) / days,
    caloriesPerMeal: {},
  };

  if (stats.caloriesPerMeal) {
    for (const mealType in stats.caloriesPerMeal) {
      avgStats.caloriesPerMeal[mealType] = (stats.caloriesPerMeal[mealType] || 0) / days;
    }
  }
  return avgStats;
};

const getStatisticsSummary = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const period = req.query.period || 'daily'; 
  
  let refDate;
  if (req.query.date) {
    const dateParts = req.query.date.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1;
    const day = parseInt(dateParts[2]);
    refDate = new Date(year, month, day, 12, 0, 0);
  } else {
    refDate = new Date();
    refDate.setHours(12, 0, 0, 0);
  }

  let daysInPeriod = 1;
  let prevDaysInPeriod = 1;
  let startDate, endDate, prevStartDate, prevEndDate;

  if (period === 'daily') {
    daysInPeriod = 1;
    prevDaysInPeriod = 1;
    
    startDate = new Date(refDate); 
    endDate = new Date(refDate);
    
    prevStartDate = new Date(refDate);
    prevStartDate.setDate(refDate.getDate() - 1);
    prevEndDate = new Date(prevStartDate);

  } else if (period === 'weekly') {
    daysInPeriod = 7;
    prevDaysInPeriod = 7;

    const dayOfWeek = refDate.getDay();
    const diff = refDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startDate = new Date(refDate.getFullYear(), refDate.getMonth(), diff);
    
    endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6);

    prevEndDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - 1);
    prevStartDate = new Date(prevEndDate.getFullYear(), prevEndDate.getMonth(), prevEndDate.getDate() - 6);
    
  } else if (period === 'monthly') {
    const currentYear = refDate.getFullYear();
    const currentMonth = refDate.getMonth();
    
    startDate = new Date(currentYear, currentMonth, 1);
    endDate = new Date(currentYear, currentMonth + 1, 0); 
    daysInPeriod = endDate.getDate(); 

    const prevMonthDate = new Date(startDate);
    prevMonthDate.setDate(0); 
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth(); 
    
    prevStartDate = new Date(prevYear, prevMonth, 1);
    prevEndDate = new Date(prevYear, prevMonth + 1, 0); 
    prevDaysInPeriod = prevEndDate.getDate();
  }

  const startDateString = getFormattedDate(startDate);
  const endDateString = getFormattedDate(endDate);
  const prevStartDateString = getFormattedDate(prevStartDate);
  const prevEndDateString = getFormattedDate(prevEndDate);

  const currentTotalStats = await getAggregatedStats(userId, startDateString, endDateString);
  const previousTotalStats = await getAggregatedStats(userId, prevStartDateString, prevEndDateString);

  const currentStats = getAverageStats(currentTotalStats, daysInPeriod);
  const yesterdayStats = getAverageStats(previousTotalStats, prevDaysInPeriod);

  const calcPercentChange = (today, yesterday) => {
    if (yesterday === 0 || yesterday === null) return 0;
    if (today === yesterday) return 0;
    return ((today - yesterday) / yesterday) * 100;
  };
  const calorieChangePercent = calcPercentChange(currentStats.totalCalories, yesterdayStats.totalCalories);
  const totalMacros = currentStats.totalProteins + currentStats.totalCarbs + currentStats.totalFats;
  let macroPercentages, macroRatio;
  if (totalMacros === 0 || currentStats.totalCalories === 0) {
    macroPercentages = { 'Karbohidrat': 0, 'Protein': 0, 'Lemak': 0 };
    macroRatio = "0/0/0";
  } else {
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