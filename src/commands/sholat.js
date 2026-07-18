import { successText, errorText, panelText, GROUP_ONLY } from '../messages.js';

export default {
  name: 'sholat',
  description: 'Lihat jadwal sholat hari ini.',
  adminOnly: false,
  usage: '[kota]',
  async run(ctx) {
    if (!ctx.groupId) return ctx.message.reply(GROUP_ONLY);
    const islamic = ctx.services.islamic;
    if (!islamic) return ctx.message.reply(errorText('Islamic module not loaded.'));

    const args = ctx.args || [];

    if (args.length > 0) {
      const query = args.join(' ');
      const locations = await islamic.prayer.searchCity(query);
      if (!locations || locations.length === 0) {
        return ctx.message.reply(errorText('Kota tidak ditemukan.', 'Coba dengan nama kota yang lebih umum.'));
      }
      const city = locations[0];
      await ctx.repos.islamic.setCity(ctx.groupId, city.id, city.name);
      await ctx.message.reply(successText('Kota Diatur', 'Completed', `Kota: ${city.name}\nGunakan !sholat untuk melihat jadwal.`));
      return;
    }

    const group = ctx.repos.islamic.getGroup(ctx.groupId);
    if (!group?.cityId) {
      return ctx.message.reply(errorText('Kota belum diatur.', `Gunakan: ${ctx.config.prefix}sholat [nama kota]\nContoh: ${ctx.config.prefix}sholat Jakarta`));
    }

    const times = await islamic.prayer.getPrayerTimes(ctx.groupId);
    if (!times) {
      return ctx.message.reply(errorText('Gagal mengambil jadwal sholat.', 'Coba lagi nanti.'));
    }

    const formatted = islamic.prayer.formatPrayerTimes(times);
    const lines = [
      `📍 *${group.cityName || group.cityId}*`,
      `📅 ${formatted.date || ''}`,
      formatted.hijri ? `📅 (Hijriyah: ${formatted.hijri})` : '',
      '',
      '🕌 *Jadwal Sholat:*',
      `   ${formatted.Fajr}`,
      `   ${formatted.Dhuhr}`,
      `   ${formatted.Asr}`,
      `   ${formatted.Maghrib}`,
      `   ${formatted.Isha}`,
    ];

    const next = islamic.prayer.getNextPrayer(times);
    if (next) {
      lines.push('', `⏰ *Sholat berikutnya:* ${next.name} (${next.time})`);
    }

    await ctx.message.reply(panelText('Prayer Times', lines.filter(Boolean), '🕌'));
  },
};
