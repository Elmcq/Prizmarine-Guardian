/**
 * !raidstatus — show Anti Raid configuration, current Raid Mode state per
 * group, and a summary of recent raid incidents. Admin only.
 */

import { humanizeDuration } from '../utils/time.js';

export default {
  name: 'raidstatus',
  description: 'Show Anti Raid configuration and current Raid Mode state.',
  adminOnly: true,
  usage: '',
  /**
   * @param {import('./index.js').CommandContext} ctx
   */
  async run(ctx) {
    const repo = ctx.repos.raid;
    const svc = ctx.services.raid;
    const s = repo.getSettings();
    const stats = repo.getStats();
    const raidModeMap = repo.getRaidModeMap();

    const lines = [
      `🚨 *${ctx.config.botName} — Anti Raid*`,
      '',
      `Enabled: ${s.enabled ? 'yes' : 'no'}`,
      `Auto Raid Mode: ${s.autoRaidMode ? 'yes' : 'no'}`,
      `Raid Mode duration: ${humanizeDuration(s.raidModeDurationMs)}`,
      `Notify admins: ${s.notifyAdmins ? 'yes' : 'no'}`,
      '',
      'Thresholds:',
      `• Mass join: ${s.thresholds.massJoin.count} users / ${humanizeDuration(s.thresholds.massJoin.windowMs)}`,
      `• Message raid: ${s.thresholds.messageRaid.count} msgs / ${humanizeDuration(s.thresholds.messageRaid.windowMs)}`,
      `• Coordinated: ${s.thresholds.coordinated.minUsers} users / ${humanizeDuration(s.thresholds.coordinated.windowMs)} (sim ${s.thresholds.coordinated.similarity})`,
      `• New-member abuse window: ${humanizeDuration(s.thresholds.newMemberAbuse.windowMs)}`,
      '',
      `Active Raid Modes: ${stats.activeRaidModes}`,
    ];

    const activeGroups = Object.entries(raidModeMap).filter(([, st]) => st && st.active);
    if (activeGroups.length) {
      lines.push('');
      lines.push('Currently in Raid Mode:');
      for (const [gid, st] of activeGroups) {
        const left = st.until ? Math.max(0, st.until - Date.now()) : 0;
        lines.push(`• ${gid} (${humanizeDuration(left)} left)`);
      }
    }

    lines.push('', 'Recent incidents:');
    const recent = repo.getIncidents().slice(-10).reverse();
    if (!recent.length) {
      lines.push('• none');
    } else {
      for (const i of recent) {
        lines.push(`• ${i.type} @ ${i.group || '?'}`);
      }
    }

    await ctx.message.reply(lines.join('\n'));
  },
};
