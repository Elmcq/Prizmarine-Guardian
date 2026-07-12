import { successText } from './messages.js';

export default {
 name: 'reloadsticker',
 description: 'Reload data/sticker.json without restarting the bot.',
 adminOnly: true,
 usage: '',
 async run(ctx) {
 await ctx.repos.sticker.reload();
 ctx.services.sticker.reload();
 await ctx.message.reply(successText('Sticker configuration reloaded', 'Active', 'Runtime settings refreshed without restarting.'));
 },
};
