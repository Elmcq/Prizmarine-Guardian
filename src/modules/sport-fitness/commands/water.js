import { panelText, errorText } from '../../commands/messages.js';
import { calculateWaterIntake } from '../calculators/water.js';

export default {
  name: 'water',
  description: 'Rekomendasi asupan air harian.',
  adminOnly: false,
  usage: '<berat_kg>',
  async run(ctx) {
    const args = ctx.args || [];
    if (args.length < 1) {
      return ctx.message.reply(errorText('Parameter kurang.', `Gunakan: ${ctx.config.prefix}water 60`));
    }
    const weight = parseFloat(args[0]);
    if (isNaN(weight) || weight <= 0) {
      return ctx.message.reply(errorText('Input tidak valid.', 'Masukkan berat dalam kg.'));
    }
    const result = calculateWaterIntake(weight);
    const lines = [
      '💧 *Water Recommendation*',
      '',
      `Berat: ${weight} kg`,
      '',
      `Rekomendasi: ~${result.liters}`,
      '',
      '💡 Minum secara berkala, jangan menunggu haus.',
    ];
    await ctx.message.reply(panelText('Water', lines, '💧'));
  },
};
