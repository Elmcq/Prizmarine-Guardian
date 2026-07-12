import { successText, errorText } from './messages.js';

export default {
 name: 'reloadtoxic',
 description: 'Reload AntiToxic keywords without restarting the bot.',
 adminOnly: true,
 usage: '',
 async run(ctx) {
 const settings = await ctx.repos.badwords.reload();
 ctx.services.toxicity.reload();
 ctx.logger.info('AntiToxic data reloaded', {
 keywords: settings.keywords,
 patterns: settings.patterns,
 categories: settings.categories,
 });
 if (settings.keywords === 0 && settings.patterns === 0) {
 return ctx.message.reply(errorText(
 'No AntiToxic keywords or patterns were loaded.',
 'Check data/badwords.json contains category arrays, then run !reloadtoxic.',
 ));
 }
 await ctx.message.reply(successText(
 'AntiToxic reloaded',
 'Completed',
 `${settings.keywords} keywords and ${settings.patterns} patterns loaded.`,
 ));
 },
};
