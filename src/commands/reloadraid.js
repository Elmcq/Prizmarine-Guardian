import { successText } from './messages.js';

export default {
 name: 'reloadraid',
 description: 'Reload data/raid.json without restarting the bot.',
 adminOnly: true,
 usage: '',
 async run(ctx) {
 await ctx.repos.raid.reload();
 ctx.services.raid.reload();
 await ctx.message.reply(successText('Raid configuration reloaded', 'Active', 'Runtime settings refreshed without restarting.'));
 },
};
