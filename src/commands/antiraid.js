import { statusText, usageText } from './messages.js';

export default {
 name: 'antiraid',
 description: 'Enable or disable the Anti Raid module.',
 adminOnly: true,
 usage: 'on|off',
 async run(ctx) {
 const arg = (ctx.args[0] || '').toLowerCase();
 if (arg !== 'on' && arg !== 'off') return ctx.message.reply(usageText(ctx.config.prefix, 'antiraid', 'on|off'));
 const enabled = arg === 'on';
 await ctx.repos.raid.setEnabled(enabled);
 ctx.services.raid.reload();
 await ctx.message.reply(statusText('Anti-Raid', enabled));
 },
};
