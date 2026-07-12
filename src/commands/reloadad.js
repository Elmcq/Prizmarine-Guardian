import { successText } from './messages.js';

export default {
 name: 'reloadad',
 description: 'Reload data/advertisement.json without restarting the bot.',
 adminOnly: true,
 usage: '',
 async run(ctx) {
 await ctx.repos.advertisement.reload();
 ctx.services.advertisement.reload();
 await ctx.message.reply(successText('Advertisement configuration reloaded', 'Active', 'Runtime settings refreshed without restarting.'));
 },
};
