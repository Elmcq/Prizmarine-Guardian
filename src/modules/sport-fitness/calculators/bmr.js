import { FITNESS_CONSTANTS } from '../constants/fitness.js';

export function calculateBMR(gender, weightKg, heightCm, age) {
  if (gender === 'male') {
    return Math.round(88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * age));
  }
  return Math.round(447.593 + (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * age));
}

export function calculateTDEE(bmr, activityLevel) {
  const level = FITNESS_CONSTANTS.ACTIVITY_LEVELS[activityLevel];
  if (!level) return null;
  return Math.round(bmr * level.multiplier);
}

export function getActivityLevels() {
  return Object.entries(FITNESS_CONSTANTS.ACTIVITY_LEVELS).map(([key, val]) => ({
    key,
    label: val.label,
    multiplier: val.multiplier,
  }));
}
