import { FITNESS_CONSTANTS } from '../constants/fitness.js';

export function calculateBMI(weightKg, heightCm) {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const category = FITNESS_CONSTANTS.BMI_CATEGORIES.find((c) => bmi >= c.min && bmi <= c.max);
  return {
    bmi: Math.round(bmi * 10) / 10,
    category: category?.label || 'Unknown',
    color: category?.color || '',
  };
}
