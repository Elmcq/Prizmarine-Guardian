import { statusText, usageText } from './messages.js';

export default {
 name: 'antisticker',
 description: 'Enable or disable the Anti Sticker Spam module.',
 adminOnly: true,
 usage: 'on|off',
 async run(ctx) {
 const arg = (ctx.args[0] || '').toLowerCase();
 if (arg !== 'on' && arg !== 'off') return ctx.message.reply(usageText(ctx.config.prefix, 'antisticker', 'on|off'));
 const enabled = arg === 'on';
 await ctx.repos.sticker.setEnabled(enabled);
 ctx.services.sticker.reload();
 await ctx.message.reply(statusText('Anti-Sticker Spam', enabled));
 },
};
