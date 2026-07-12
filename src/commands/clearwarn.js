/**
 * !clearwarn @user — reset a user's warning count to zero. Admin only.
 */

import { getMentionedIds, mentionToken } from '../utils/mentions.js';
import { usageText } from '../utils/formatter.js';

export default {
  name: 'clearwarn',
  description: 'Reset a user\'s warnings to zero.',
  adminOnly: true,
  usage: '@user',
  /**
   * @param {import('./index.js').CommandContext} ctx
   */
  async run(ctx) {
    if (!ctx.groupId) {
      return ctx.message.reply('⚠️ This command only works in groups.');
    }
    const targets = getMentionedIds(ctx.message);
    if (!targets.length) {
      return ctx.message.reply(usageText(ctx.config.prefix, 'clearwarn', '@user'));
    }
    const target = targets[0];
    await ctx.services.moderation.clearWarnings(ctx.groupId, target);
    await ctx.services.moderation.sendWithMentions(
      ctx.groupId,
      `🧹 Warnings cleared for ${mentionToken(target)}.`,
      [target],
    );
  },
};
