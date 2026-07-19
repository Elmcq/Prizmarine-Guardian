import { panelText, errorText } from '../../commands/messages.js';
import { calculatePace } from '../calculators/pace.js';

export default {
  name: 'pace',
  description: 'Hitung pace (kecepatan lari).',
  adminOnly: false,
  usage: '<distance_km> <time_min>',
  async run(ctx) {
    const args = ctx.args || [];
    if (args.length < 2) {
      return ctx.message.reply(errorText('Parameter kurang.', `Gunakan: ${ctx.config.prefix}pace 5 30`));
    }
    const distance = parseFloat(args[0]);
    const time = parseFloat(args[1]);
    if (isNaN(distance) || isNaN(time) || distance <= 0 || time <= 0) {
      return ctx.message.reply(errorText('Input tidak valid.'));
    }
    const result = calculatePace(distance, time);
    if (!result) {
      return ctx.message.reply(errorText('Perhitungan gagal.'));
    }
    const lines = [
      '🏃 *Running Pace*',
      '',
      `Distance: ${result.distance}`,
      `Time: ${result.duration}`,
      '',
      `Pace: ${result.pace}`,
    ];
    await ctx.message.reply(panelText('Pace', lines, '🏃'));
  },
};
