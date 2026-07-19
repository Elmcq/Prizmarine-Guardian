import { panelText, errorText } from '../../../commands/messages.js';
import { calculateBMR, calculateTDEE, getActivityLevels } from '../calculators/bmr.js';

export default {
  name: 'tdee',
  description: 'Hitung Total Daily Energy Expenditure (TDEE).',
  adminOnly: false,
  usage: '<gender: l/p> <usia> <berat_kg> <tinggi_cm> <aktivitas>',
  async run(ctx) {
    const args = ctx.args || [];
    if (args.length < 5) {
      const levels = getActivityLevels().map((l) => `   ${l.key} — ${l.label}`).join('\n');
      return ctx.message.reply(errorText('Parameter kurang.', `Gunakan: ${ctx.config.prefix}tdee l 25 60 170 light\n\nLevel aktivitas:\n${levels}`));
    }
    const gender = args[0].toLowerCase();
    const age = parseInt(args[1]);
    const weight = parseFloat(args[2]);
    const height = parseFloat(args[3]);
    const activity = args[4].toLowerCase();
    if (!['l', 'p'].includes(gender) || isNaN(age) || isNaN(weight) || isNaN(height)) {
      return ctx.message.reply(errorText('Input tidak valid.'));
    }
    const g = gender === 'l' ? 'male' : 'female';
    const bmr = calculateBMR(g, weight, height, age);
    const tdee = calculateTDEE(bmr, activity);
    if (!tdee) {
      return ctx.message.reply(errorText('Level aktivitas tidak valid.', 'sedentary, light, moderate, active, extreme'));
    }
    const levelInfo = getActivityLevels().find((l) => l.key === activity);
    const lines = [
      '⚡ *TDEE Calculator*',
      '',
      `Gender: ${gender === 'l' ? 'Laki-laki' : 'Perempuan'}`,
      `Usia: ${age} tahun`,
      `Berat: ${weight} kg`,
      `Tinggi: ${height} cm`,
      `Aktivitas: ${levelInfo?.label || activity}`,
      '',
      `BMR: ${bmr} kalori/hari`,
      `TDEE: ${tdee} kalori/hari`,
      '',
      '💡 TDEE = total kalori yang dibutuhkan per hari sesuai aktivitas.',
    ];
    await ctx.message.reply(panelText('TDEE', lines, '⚡'));
  },
};
