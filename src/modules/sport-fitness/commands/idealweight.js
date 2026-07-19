import { panelText, errorText } from '../../commands/messages.js';
import { calculateIdealWeight } from '../calculators/idealWeight.js';

export default {
  name: 'idealweight',
  description: 'Estimasi berat badan ideal berdasarkan tinggi.',
  adminOnly: false,
  usage: '<tinggi_cm>',
  async run(ctx) {
    const args = ctx.args || [];
    if (args.length < 1) {
      return ctx.message.reply(errorText('Parameter kurang.', `Gunakan: ${ctx.config.prefix}idealweight 170`));
    }
    const height = parseFloat(args[0]);
    if (isNaN(height) || height <= 0) {
      return ctx.message.reply(errorText('Input tidak valid.', 'Masukkan tinggi dalam cm.'));
    }
    const result = calculateIdealWeight(height);
    const lines = [
      '⚖️ *Ideal Weight*',
      '',
      `Tinggi: ${height} cm`,
      '',
      `Berat ideal: ${result.range}`,
      `Rata-rata: ${result.mid} kg`,
      '',
      '💡 Berat ideal bukan segalanya. Yang penting gaya hidup sehat!',
    ];
    await ctx.message.reply(panelText('Ideal Weight', lines, '⚖️'));
  },
};
