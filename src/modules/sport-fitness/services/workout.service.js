import { FITNESS_CONSTANTS } from '../constants/fitness.js';

export class WorkoutService {
  getWorkout(level = 'beginner') {
    return FITNESS_CONSTANTS.WORKOUTS[level] || FITNESS_CONSTANTS.WORKOUTS.beginner;
  }

  getStretch() {
    return FITNESS_CONSTANTS.STRETCHES;
  }

  formatWorkout(workout, level) {
    const lines = workout.map((w, i) => `${i + 1}. *${w.name}* — ${w.reps} (rest ${w.rest})`);
    return [
      `🏋️ *Workout (${level || 'beginner'})*`,
      '',
      ...lines,
      '',
      '💡 *Tips:*',
      '🔥 Warm up sebelum mulai',
      '💧 Minum air setelah selesai',
      '🍽️ Makan yang cukup setelah latihan',
    ].join('\n');
  }

  formatStretch(stretches) {
    const lines = stretches.map((s, i) => `${i + 1}. *${s.name}* (${s.duration}) — ${s.desc}`);
    return [
      '🧘 *Stretching Routine*',
      '',
      ...lines,
      '',
      '💡 Lakukan perlahan, jangan paksa.',
    ].join('\n');
  }
}

export default WorkoutService;
