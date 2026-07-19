import { panelText, errorText, GROUP_ONLY } from '../../commands/messages.js';
import { calculateBMI } from '../calculators/bmi.js';

export default {
  name: 'bmi',
  description: 'Hitung Body Mass Index (BMI).',
  adminOnly: false,
  usage: '<berat_kg> <tinggi_cm>',
  async run(ctx) {
    const args = ctx.args || [];
    if (args.length < 2) {
      return ctx.message.reply(errorText('Parameter kurang.', `Gunakan: ${ctx.config.prefix}bmi 60 170`));
    }
    const weight = parseFloat(args[0]);
    const height = parseFloat(args[1]);
    if (isNaN(weight) || isNaN(height) || weight <= 0 || height <= 0) {
      return ctx.message.reply(errorText('Input tidak valid.', 'Masukkan angka yang benar.'));
    }
    const result = calculateBMI(weight, height);
    const lines = [
      '🏃 *BMI Calculator*',
      '',
      `Berat: ${weight} kg`,
      `Tinggi: ${height} cm`,
      '',
      `BMI: ${result.bmi}`,
      '',
      `Kategori: ${result.color} ${result.category}`,
    ];
    await ctx.message.reply(panelText('BMI', lines, '🏃'));
  },
};
