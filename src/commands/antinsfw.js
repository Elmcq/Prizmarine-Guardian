import { statusText, usageText } from './messages.js';

export default {
 name: 'antinsfw',
 description: 'Enable or disable the NSFW moderation module.',
 adminOnly: true,
 usage: 'on|off',
 async run(ctx) {
 const arg = (ctx.args[0] || '').toLowerCase();
 if (arg !== 'on' && arg !== 'off') return ctx.message.reply(usageText(ctx.config.prefix, 'antinsfw', 'on|off'));
 const enabled = arg === 'on';
 await ctx.repos.nsfw.setEnabled(enabled);
 ctx.services.nsfw.reload();
 await ctx.message.reply(statusText('Anti-NSFW', enabled));
 },
};
