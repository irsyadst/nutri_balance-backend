const calculateNeeds = (profile) => {
    if (!profile || !profile.currentWeight || !profile.height || !profile.age) return;
    let bmr;
    if (profile.gender === 'Pria') { 
        bmr = 88.362 + (13.397 * profile.currentWeight) + (4.799 * profile.height) - (5.677 * profile.age); 
    } else { 
        bmr = 447.593 + (9.247 * profile.currentWeight) + (3.098 * profile.height) - (4.330 * profile.age); 
    }
    let activityMultiplier = 1.2; // Menetap
    if (profile.activityLevel === 'Aktivitas Ringan') activityMultiplier = 1.375;
    if (profile.activityLevel === 'Aktivitas Sedang') activityMultiplier = 1.55;
    if (profile.activityLevel === 'Sangat Aktif') activityMultiplier = 1.725;

    let tdee = bmr * activityMultiplier;

    if (profile.goals && profile.goals.includes('Penurunan berat badan')) {
        tdee -= 500;
    } else if (profile.goals && profile.goals.includes('Peningkatan massa otot')) {
        tdee += 500;
    }

    profile.targetCalories = Math.round(tdee);
    profile.targetCarbs = Math.round((tdee * 0.45) / 4);
    profile.targetProteins = Math.round((tdee * 0.30) / 4);
    profile.targetFats = Math.round((tdee * 0.25) / 9);
};

module.exports = calculateNeeds;