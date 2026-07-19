import { panelText } from '../../../commands/messages.js';
import { WorkoutService } from '../services/workout.service.js';

const workoutService = new WorkoutService();

export default {
  name: 'workout',
  description: 'Workout harian (push up, squat, plank, dll).',
  adminOnly: false,
  usage: '[beginner|intermediate|advanced]',
  async run(ctx) {
    const level = (ctx.args?.[0] || 'beginner').toLowerCase();
    const workout = workoutService.getWorkout(level);
    await ctx.message.reply(workoutService.formatWorkout(workout, level));
  },
};
