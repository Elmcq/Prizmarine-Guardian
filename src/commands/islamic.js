import { successText, errorText, panelText, GROUP_ONLY } from './messages.js';

export default {
  name: 'islamic',
  description: 'Pengaturan modul Islamic (reminder, kota, auto-lock).',
  adminOnly: true,
  usage: '[reminder on|off] | [autolock on|off] | [lockbefore <menit>] | [lockafter <menit>] | [status]',
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
        return ctx.message.reply(successText('Prayer Reminder Aktif', 'Completed', 'Pengingat sholat akan dikirim ke grup.'));
      }
      if (action === 'off') {
        await ctx.repos.islamic.setReminderEnabled(ctx.groupId, false);
        return ctx.message.reply(successText('Prayer Reminder Nonaktif', 'Completed', 'Pengingat sholat dimatikan.'));
      }
      return ctx.message.reply(errorText('Pilih on atau off.', `Gunakan: ${ctx.config.prefix}islamic reminder on/off`));
    }

    if (sub === 'autolock') {
      const action = args[1]?.toLowerCase();
      if (action === 'on') {
        await ctx.repos.islamic.saveGroup(ctx.groupId, { autoLock: true });
        return ctx.message.reply(successText('Auto-Lock Aktif', 'Completed', 'Group akan di-lock sebelum Maghrib dan dibuka setelahnya.'));
      }
      if (action === 'off') {
        await ctx.repos.islamic.saveGroup(ctx.groupId, { autoLock: false });
        return ctx.message.reply(successText('Auto-Lock Nonaktif', 'Completed', 'Auto-lock Maghrib dimatikan.'));
      }
      return ctx.message.reply(errorText('Pilih on atau off.', `Gunakan: ${ctx.config.prefix}islamic autolock on/off`));
    }

    if (sub === 'lockbefore') {
      const minutes = parseInt(args[1]);
      if (isNaN(minutes) || minutes < 1 || minutes > 30) {
        return ctx.message.reply(errorText('Menit harus 1-30.'));
      }
      await ctx.repos.islamic.saveGroup(ctx.groupId, { autoLockBefore: minutes });
      return ctx.message.reply(successText('Lock Before Diatur', 'Completed', `Group akan di-lock ${minutes} menit sebelum Maghrib.`));
    }

    if (sub === 'lockafter') {
      const minutes = parseInt(args[1]);
      if (isNaN(minutes) || minutes < 1 || minutes > 60) {
        return ctx.message.reply(errorText('Menit harus 1-60.'));
      }
      await ctx.repos.islamic.saveGroup(ctx.groupId, { autoLockAfter: minutes });
      return ctx.message.reply(successText('Lock After Diatur', 'Completed', `Group akan dibuka ${minutes} menit setelah Maghrib.`));
    }

    if (sub === 'timezone') {
      const tz = args[1];
      if (!tz) return ctx.message.reply(errorText('Timezone tidak boleh kosong.', `Contoh: ${ctx.config.prefix}islamic timezone 7`));
      await ctx.repos.islamic.setTimezone(ctx.groupId, tz);
      return ctx.message.reply(successText('Timezone Diatur', 'Completed', `Timezone: UTC+${tz}`));
    }

    const group = ctx.repos.islamic.getGroup(ctx.groupId) || {};
    const lines = [
      `📍 Kota: ${group.cityName || 'Belum diatur'}`,
      `🕌 Reminder: ${group.reminderEnabled ? '🟢 Aktif' : '🔴 Nonaktif'}`,
      `🔒 Auto-Lock: ${group.autoLock ? '🟢 Aktif' : '🔴 Nonaktif'}`,
      `⏰ Lock Before: ${group.autoLockBefore || 5} menit sebelum Maghrib`,
      `⏰ Lock After: ${group.autoLockAfter || 15} menit setelah Maghrib`,
      `🕌 Prayer Mode: ${islamic.prayerMode.isActive(ctx.groupId) ? '🟢 Aktif' : '🔴 Nonaktif'}`,
      `🌐 Timezone: UTC+${group.timezone || '7 (default)'}`,
      `📐 Koordinat: ${group.lat && group.lng ? `${group.lat}, ${group.lng}` : 'Belum diatur'}`,
      '',
      'Sub-commands:',
      `   ${ctx.config.prefix}islamic reminder on/off`,
      `   ${ctx.config.prefix}islamic autolock on/off`,
      `   ${ctx.config.prefix}islamic lockbefore <menit>`,
      `   ${ctx.config.prefix}islamic lockafter <menit>`,
      `   ${ctx.config.prefix}islamic timezone <angka>`,
      '',
      'Setup:',
      `   ${ctx.config.prefix}sholat [kota] — Atur kota`,
      `   ${ctx.config.prefix}qibla [kota] — Atur lokasi + arah kiblat`,
    ];

    await ctx.message.reply(panelText('Islamic Settings', lines, '🕌'));
  },
};
