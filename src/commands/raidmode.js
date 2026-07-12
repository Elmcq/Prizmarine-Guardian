import { statusText, usageText, GROUP_ONLY } from './messages.js';

export default {
 name: 'raidmode',
 description: 'Manually enable or disable Raid Mode for this group.',
 adminOnly: true,
 usage: 'on|off',
 async run(ctx) {
 const arg = (ctx.args[0] || '').toLowerCase();
 if (arg !== 'on' && arg !== 'off') return ctx.message.reply(usageText(ctx.config.prefix, 'raidmode', 'on|off'));
 if (!ctx.groupId) return ctx.message.reply(GROUP_ONLY);
 const active = arg === 'on';
 await ctx.services.raid.setRaidMode(ctx.groupId, active);
 await ctx.message.reply(statusText('Raid Mode', active, [active ? 'Moderation sensitivity increased.' : 'Standard moderation restored.']));
 },
};
