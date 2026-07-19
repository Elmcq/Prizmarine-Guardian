import { panelText, errorText } from '../../commands/messages.js';
import { calculateBMR, getActivityLevels } from '../calculators/bmr.js';

export default {
  name: 'bmr',
  description: 'Hitung Basal Metabolic Rate (BMR).',
  adminOnly: false,
  usage: '<gender: l/p> <usia> <berat_kg> <tinggi_cm>',
  async run(ctx) {
    const args = ctx.args || [];
    if (args.length < 4) {
      return ctx.message.reply(errorText('Parameter kurang.', `Gunakan: ${ctx.config.prefix}bmr l 25 60 170`));
    }
    const gender = args[0].toLowerCase();
    const age = parseInt(args[1]);
    const weight = parseFloat(args[2]);
    const height = parseFloat(args[3]);
    if (!['l', 'p'].includes(gender) || isNaN(age) || isNaN(weight) || isNaN(height)) {
      return ctx.message.reply(errorText('Input tidak valid.', 'Gender: l/p, lainnya angka.'));
    }
    const g = gender === 'l' ? 'male' : 'female';
    const bmr = calculateBMR(g, weight, height, age);
    const lines = [
      '🔥 *BMR Calculator*',
      '',
      `Gender: ${gender === 'l' ? 'Laki-laki' : 'Perempuan'}`,
      `Usia: ${age} tahun`,
      `Berat: ${weight} kg`,
      `Tinggi: ${height} cm`,
      '',
      `BMR: ${bmr} kalori/hari`,
      '',
      '💡 BMR = jumlah kalori yang dibutuhkan tubuh saat istirahat.',
    ];
    await ctx.message.reply(panelText('BMR', lines, '🔥'));
  },
};
