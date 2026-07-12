import { successText } from './messages.js';

export default {
 name: 'reloadtoxic',
 description: 'Reload AntiToxic keywords without restarting the bot.',
 adminOnly: true,
 usage: '',
 async run(ctx) {
 await ctx.repos.badwords.reload();
 ctx.services.toxicity.reload();
 const settings = ctx.repos.badwords.getSettings();
 await ctx.message.reply(successText(
 'AntiToxic reloaded',
 'Completed',
 `${settings.keywords} keywords and ${settings.patterns} patterns loaded.`,
 ));
 },
};
