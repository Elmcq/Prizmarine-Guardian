import { panelText } from './messages.js';

export default {
 name: 'help',
 description: 'Show all available commands.',
 adminOnly: false,
 usage: '',
 async run(ctx) {
 const isAdmin = ctx.isAdmin || ctx.isOwner;
 const lines = [];
 for (const cmd of ctx.commandRegistry.values()) {
 if (cmd.adminOnly && !isAdmin) continue;
 const usage = cmd.usage ? ` ${cmd.usage}` : '';
 lines.push(`*${ctx.config.prefix}${cmd.name}${usage}*`, cmd.description, '');
 }
 lines.push('Admin commands require group-admin access.');
 await ctx.message.reply(panelText('Guardian Commands', lines, '🛡️'));
 },
};
