import { successText, errorText, panelText, GROUP_ONLY } from './messages.js';

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
      const locations = islamic.prayer.searchCity(query);
      if (!locations || locations.length === 0) {
        return ctx.message.reply(errorText('Kota tidak ditemukan.', 'Contoh: Surabaya, Jakarta, Malang, Bandung'));
      }
      const city = locations[0];
      const cityName = city.name || query;
      await ctx.repos.islamic.setCity(ctx.groupId, city.id, cityName);
      await ctx.repos.islamic.setCoordinates(ctx.groupId, city.lat, city.lng);
      return ctx.message.reply(successText('Kota Diatur', 'Completed', `Kota: ${cityName}\nGunakan !sholat untuk melihat jadwal.`));
    }

    const group = ctx.repos.islamic.getGroup(ctx.groupId);
    if (!group?.cityId && !group?.lat) {
      return ctx.message.reply(errorText('Kota belum diatur.', `Gunakan: ${ctx.config.prefix}sholat [nama kota]\nContoh: ${ctx.config.prefix}sholat Surabaya`));
    }

    const times = islamic.prayer.getPrayerTimes(ctx.groupId);
    if (!times) {
      return ctx.message.reply(errorText('Gagal menghitung jadwal sholat.'));
    }

    const formatted = islamic.prayer.formatPrayerTimes(times);
    const lines = [
      `📍 *${group.cityName || group.cityId || 'Lokasi'}*`,
      '',
      '🕌 *Jadwal Sholat:*',
      `   ${formatted.Fajr}`,
      formatted.Sunrise ? `   ${formatted.Sunrise}` : '',
      `   ${formatted.Dhuhr}`,
      `   ${formatted.Asr}`,
      `   ${formatted.Maghrib}`,
      `   ${formatted.Isha}`,
    ];

    const next = islamic.prayer.getNextPrayer(times);
    if (next) {
      lines.push('', `⏰ *Sholat berikutnya:* ${next.displayName} (${next.time})`);
    }

    await ctx.message.reply(panelText('Prayer Times', lines.filter(Boolean), '🕌'));
  },
};
