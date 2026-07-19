import { WorkoutService } from '../services/workout.service.js';

const workoutService = new WorkoutService();

export default {
  name: 'stretch',
  description: 'Stretching routine untuk pemanasan/pendinginan.',
  adminOnly: false,
  async run(ctx) {
    const stretches = workoutService.getStretch();
    await ctx.message.reply(workoutService.formatStretch(stretches));
  },
};
