import { successText, errorText, panelText, GROUP_ONLY } from './messages.js';

export default {
  name: 'prayermode',
  description: 'Aktifkan/nonaktifkan mode sholat (blokir command selama sholat).',
  adminOnly: true,
  usage: '[on|off] [menit]',
  async run(ctx) {
    if (!ctx.groupId) return ctx.message.reply(GROUP_ONLY);
    const islamic = ctx.services.islamic;
    if (!islamic) return ctx.message.reply(errorText('Islamic module not loaded.'));

    const args = ctx.args || [];
    const action = args[0]?.toLowerCase();

    if (action === 'on') {
      const duration = parseInt(args[1]) || 30;
      islamic.prayerMode.startSession(ctx.groupId, duration);
      await ctx.message.reply(successText('Prayer Mode Aktif', 'Completed', `Mode sholat aktif selama ${duration} menit.\nCommand yang diblokir akan diabaikan.`));
      return;
    }

    if (action === 'off') {
      islamic.prayerMode.endSession(ctx.groupId);
      await ctx.message.reply(successText('Prayer Mode Nonaktif', 'Completed', 'Mode sholat telah dimatikan.'));
      return;
    }

    const active = islamic.prayerMode.isActive(ctx.groupId);
    const lines = [
      `Status: ${active ? '🟢 Aktif' : '🔴 Nonaktif'}`,
      '',
      'Gunakan:',
      `   ${ctx.config.prefix}prayermode on [menit] — Aktifkan`,
      `   ${ctx.config.prefix}prayermode off — Nonaktifkan`,
    ];

    await ctx.message.reply(panelText('Prayer Mode', lines, '🕌'));
  },
};
