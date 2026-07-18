import { successText, errorText, panelText, GROUP_ONLY } from './messages.js';

export default {
  name: 'islamic',
  description: 'Pengaturan modul Islamic (reminder, kota, timezone).',
  adminOnly: true,
  usage: '[reminder on|off] | [timezone <tz>] | [offset <prayer> <menit>] | [status]',
  async run(ctx) {
    if (!ctx.groupId) return ctx.message.reply(GROUP_ONLY);
    const islamic = ctx.services.islamic;
    if (!islamic) return ctx.message.reply(errorText('Islamic module not loaded.'));

    const args = ctx.args || [];
    const sub = args[0]?.toLowerCase();

    if (sub === 'reminder') {
      const action = args[1]?.toLowerCase();
      if (action === 'on') {
        await ctx.repos.islamic.setReminderEnabled(ctx.groupId, true);
        await ctx.message.reply(successText('Prayer Reminder Aktif', 'Completed', 'Pengingat sholat akan dikirim ke grup.'));
        return;
      }
      if (action === 'off') {
        await ctx.repos.islamic.setReminderEnabled(ctx.groupId, false);
        await ctx.message.reply(successText('Prayer Reminder Nonaktif', 'Completed', 'Pengingat sholat dimatikan.'));
        return;
      }
      return ctx.message.reply(errorText('Pilih on atau off.', `Gunakan: ${ctx.config.prefix}islamic reminder on/off`));
    }

    if (sub === 'timezone') {
      const tz = args[1];
      if (!tz) return ctx.message.reply(errorText('Timezone tidak boleh kosong.', `Contoh: ${ctx.config.prefix}islamic timezone Asia/Jakarta`));
      await ctx.repos.islamic.setTimezone(ctx.groupId, tz);
      await ctx.message.reply(successText('Timezone Diatur', 'Completed', `Timezone: ${tz}`));
      return;
    }

    if (sub === 'offset') {
      const prayer = args[1]?.toLowerCase();
      const minutes = parseInt(args[2]);
      const validPrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
      if (!prayer || !validPrayers.includes(prayer)) {
        return ctx.message.reply(errorText('Nama sholat tidak valid.', `Pilihan: ${validPrayers.join(', ')}`));
      }
      if (isNaN(minutes) || minutes < 0 || minutes > 60) {
        return ctx.message.reply(errorText('Menit harus 0-60.'));
      }
      const prayerKey = prayer.charAt(0).toUpperCase() + prayer.slice(1);
      await ctx.repos.islamic.setReminderOffset(ctx.groupId, prayerKey, minutes);
      await ctx.message.reply(successText('Offset Diatur', 'Completed', `Iqomah reminder ${prayerKey}: ${minutes} menit sebelum waktu sholat.`));
      return;
    }

    const group = ctx.repos.islamic.getGroup(ctx.groupId) || {};
    const lines = [
      `📍 Kota: ${group.cityName || group.cityId || 'Belum diatur'}`,
      `🕌 Reminder: ${group.reminderEnabled ? '🟢 Aktif' : '🔴 Nonaktif'}`,
      `🕌 Prayer Mode: ${islamic.prayerMode.isActive(ctx.groupId) ? '🟢 Aktif' : '🔴 Nonaktif'}`,
      `🌐 Timezone: ${group.timezone || 'Asia/Jakarta (default)'}`,
      `📐 Koordinat: ${group.lat && group.lng ? `${group.lat}, ${group.lng}` : 'Belum diatur'}`,
      '',
      'Sub-commands:',
      `   ${ctx.config.prefix}islamic reminder on/off`,
      `   ${ctx.config.prefix}islamic timezone <tz>`,
      `   ${ctx.config.prefix}islamic offset <prayer> <menit>`,
      '',
      'Setup:',
      `   ${ctx.config.prefix}sholat [kota] — Atur kota`,
      `   ${ctx.config.prefix}qibla [lat] [lng] — Atur koordinat`,
    ];

    await ctx.message.reply(panelText('Islamic Settings', lines, '🕌'));
  },
};
