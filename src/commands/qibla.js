import { successText, errorText, panelText, GROUP_ONLY } from './messages.js';
import { findCity } from '../utils/cities.js';

export default {
  name: 'qibla',
  description: 'Lihat arah kiblat dari lokasi grup.',
  adminOnly: false,
  usage: '[kota] atau [lat] [lng]',
  async run(ctx) {
    if (!ctx.groupId) return ctx.message.reply(GROUP_ONLY);
    const islamic = ctx.services.islamic;
    if (!islamic) return ctx.message.reply(errorText('Islamic module not loaded.'));

    const args = ctx.args || [];

    if (args.length === 1) {
      const city = findCity(args.join(' '));
      if (city) {
        await ctx.repos.islamic.setCoordinates(ctx.groupId, city.lat, city.lng);
        await ctx.repos.islamic.setCity(ctx.groupId, city.id, city.name);
        const qibla = islamic.qibla.getQiblaFromCoords(city.lat, city.lng);
        const lines = [
          `📍 *${city.name}*`,
          '',
          `🕌 *Arah Kiblat:*`,
          `   ${qibla.degree.toFixed(1)}° ${qibla.direction.emoji} ${qibla.direction.label}`,
        ];
        return ctx.message.reply(panelText('Qibla Direction', lines, '🧭'));
      }
    }

    if (args.length >= 2) {
      const lat = parseFloat(args[0]);
      const lng = parseFloat(args[1]);
      if (isNaN(lat) || isNaN(lng)) {
        return ctx.message.reply(errorText('Koordinat tidak valid.', `Gunakan: ${ctx.config.prefix}qibla -6.2 106.8`));
      }
      await ctx.repos.islamic.setCoordinates(ctx.groupId, lat, lng);
      const qibla = islamic.qibla.getQiblaFromCoords(lat, lng);
      const lines = [
        `📍 *${lat}, ${lng}*`,
        '',
        `🕌 *Arah Kiblat:*`,
        `   ${qibla.degree.toFixed(1)}° ${qibla.direction.emoji} ${qibla.direction.label}`,
      ];
      return ctx.message.reply(panelText('Qibla Direction', lines, '🧭'));
    }

    const group = ctx.repos.islamic.getGroup(ctx.groupId);
    if (!group?.lat || !group?.lng) {
      return ctx.message.reply(errorText('Lokasi belum diatur.', `Gunakan: ${ctx.config.prefix}qibla [kota]\nContoh: ${ctx.config.prefix}qibla Surabaya`));
    }

    const qibla = islamic.qibla.getQiblaFromCoords(group.lat, group.lng);
    const lines = [
      `📍 *${group.cityName || `${group.lat}, ${group.lng}`}*`,
      '',
      `🕌 *Arah Kiblat:*`,
      `   ${qibla.degree.toFixed(1)}° ${qibla.direction.emoji} ${qibla.direction.label}`,
    ];

    await ctx.message.reply(panelText('Qibla Direction', lines, '🧭'));
  },
};
