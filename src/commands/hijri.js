import { panelText, GROUP_ONLY, errorText } from '../messages.js';

export default {
  name: 'hijri',
  description: 'Lihat tanggal Hijriyah hari ini.',
  adminOnly: false,
  async run(ctx) {
    if (!ctx.groupId) return ctx.message.reply(GROUP_ONLY);
    const islamic = ctx.services.islamic;
    if (!islamic) return ctx.message.reply(errorText('Islamic module not loaded.'));

    const hijri = await islamic.hijri.getHijriDate(ctx.groupId, ctx.repos.islamic);
    if (!hijri) {
      return ctx.message.reply(errorText('Gagal mengambil tanggal Hijriyah.'));
    }

    const formatted = islamic.hijri.formatHijri(hijri);
    const now = new Date();
    const gregorian = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const lines = [
      `📅 *Tanggal Hijriyah:*`,
      `   ${formatted}`,
      '',
      `📅 *Tanggal Masehi:*`,
      `   ${gregorian}`,
      '',
      `🕌 *Hari:* ${hijri.dayOfWeek || '-'}`,
    ];

    await ctx.message.reply(panelText('Hijri Calendar', lines, '📅'));
  },
};
