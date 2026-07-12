import { successText } from './messages.js';

export default {
 name: 'reloadnsfw',
 description: 'Reload data/nsfw.json without restarting the bot.',
 adminOnly: true,
 usage: '',
 async run(ctx) {
 await ctx.repos.nsfw.reload();
 ctx.services.nsfw.reload();
 await ctx.message.reply(successText('NSFW configuration reloaded', 'Active', 'Runtime settings refreshed without restarting.'));
 },
};
