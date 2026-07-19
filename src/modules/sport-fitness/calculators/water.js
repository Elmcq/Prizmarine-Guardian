import { FITNESS_CONSTANTS } from '../constants/fitness.js';

export function calculateWaterIntake(weightKg) {
  const ml = weightKg * FITNESS_CONSTANTS.WATER_ML_PER_KG;
  const liters = (ml / 1000).toFixed(1);
  return { ml, liters: `${liters} Liter/hari` };
}
