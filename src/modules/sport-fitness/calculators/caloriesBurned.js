import { FITNESS_CONSTANTS } from '../constants/fitness.js';

export function calculateCaloriesBurned(activity, weightKg, durationMin) {
  const act = FITNESS_CONSTANTS.CALORIE_BURN[activity];
  if (!act) return null;
  const calories = Math.round(act.met * weightKg * (durationMin / 60));
  return { activity: act.label, calories, duration: durationMin };
}
