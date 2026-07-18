import { successText, errorText, panelText, GROUP_ONLY } from '../messages.js';

export default {
  name: 'qibla',
  description: 'Lihat arah kiblat dari lokasi grup.',
  adminOnly: false,
  usage: '[lat] [lng]',
  async run(ctx) {
    if (!ctx.groupId) return ctx.message.reply(GROUP_ONLY);
    const islamic = ctx.services.islamic;
    if (!islamic) return ctx.message.reply(errorText('Islamic module not loaded.'));

    const args = ctx.args || [];

    if (args.length >= 2) {
      const lat = parseFloat(args[0]);
      const lng = parseFloat(args[1]);
      if (isNaN(lat) || isNaN(lng)) {
        return ctx.message.reply(errorText('Koordinat tidak valid.', `Gunakan: ${ctx.config.prefix}qibla -6.2 106.8`));
      }
      await ctx.repos.islamic.setCoordinates(ctx.groupId, lat, lng);
      await ctx.message.reply(successText('Koordinat Diatur', 'Completed', `Lat: ${lat}, Lng: ${lng}`));
      return;
    }

    const group = ctx.repos.islamic.getGroup(ctx.groupId);
    if (!group?.lat || !group?.lng) {
      return ctx.message.reply(errorText('Koordinat belum diatur.', `Gunakan: ${ctx.config.prefix}qibla [lat] [lng]\nContoh: ${ctx.config.prefix}qibla -6.2 106.8`));
    }

    const qibla = islamic.qibla.getQiblaFromCoords(group.lat, group.lng);
    if (!qibla) {
      return ctx.message.reply(errorText('Gagal menghitung arah kiblat.'));
    }

    const lines = [
      `📍 *Lokasi:* ${group.lat}, ${group.lng}`,
      '',
      `🕌 *Arah Kiblat:*`,
      `   ${qibla.degree.toFixed(1)}° ${qibla.direction.emoji} ${qibla.direction.label}`,
      '',
      'Gunakan kompas untuk mengarahkan ke kiblat.',
    ];

    await ctx.message.reply(panelText('Qibla Direction', lines, '🧭'));
  },
};
