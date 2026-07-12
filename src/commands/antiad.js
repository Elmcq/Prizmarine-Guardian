import { statusText, usageText } from './messages.js';

export default {
 name: 'antiad',
 description: 'Enable or disable the Anti Advertisement module.',
 adminOnly: true,
 usage: 'on|off',
 async run(ctx) {
 const arg = (ctx.args[0] || '').toLowerCase();
 if (arg !== 'on' && arg !== 'off') return ctx.message.reply(usageText(ctx.config.prefix, 'antiad', 'on|off'));
 const enabled = arg === 'on';
 await ctx.repos.advertisement.setEnabled(enabled);
 ctx.services.advertisement.reload();
 await ctx.message.reply(statusText('Anti-Advertisement', enabled));
 },
};
