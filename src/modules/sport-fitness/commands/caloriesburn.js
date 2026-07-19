import { panelText, errorText } from '../../commands/messages.js';
import { calculateCaloriesBurned } from '../calculators/caloriesBurned.js';
import { FITNESS_CONSTANTS } from '../constants/fitness.js';

export default {
  name: 'caloriesburn',
  description: 'Hitung kalori terbakar berdasarkan aktivitas.',
  adminOnly: false,
  usage: '<aktivitas> <berat_kg> <menit>',
  async run(ctx) {
    const args = ctx.args || [];
    if (args.length < 3) {
      const acts = Object.keys(FITNESS_CONSTANTS.CALORIE_BURN).join(', ');
      return ctx.message.reply(errorText('Parameter kurang.', `Gunakan: ${ctx.config.prefix}caloriesburn running 60 30\n\nAktivitas: ${acts}`));
    }
    const activity = args[0].toLowerCase();
    const weight = parseFloat(args[1]);
    const duration = parseFloat(args[2]);
    if (!FITNESS_CONSTANTS.CALORIE_BURN[activity] || isNaN(weight) || isNaN(duration)) {
      return ctx.message.reply(errorText('Input tidak valid.'));
    }
    const result = calculateCaloriesBurned(activity, weight, duration);
    const lines = [
      '🔥 *Calories Burned*',
      '',
      `Aktivitas: ${result.activity}`,
      `Berat: ${weight} kg`,
      `Durasi: ${result.duration} menit`,
      '',
      `Kalori terbakar: ~${result.calories} kcal`,
      '',
      '💡 Nilai perkiraan. Actual bisa bervariasi.',
    ];
    await ctx.message.reply(panelText('Calories', lines, '🔥'));
  },
};
