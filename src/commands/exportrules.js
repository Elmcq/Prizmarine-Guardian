/**
 * !exportrules — export data/rules.json as a downloadable document in the chat.
 * Owner only.
 *
 * The rules are serialised to a temporary file and sent as a WhatsApp document
 * via MessageMedia; the temp file is removed afterwards.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import wa from 'whatsapp-web.js';

const { MessageMedia } = wa;

const OWNER_ONLY = '🚫 This command is owner-only.';

export default {
  name: 'exportrules',
  description: 'Export the rules file as a downloadable document (owner only).',
  adminOnly: true,
  usage: '',
  /**
   * @param {import('./index.js').CommandContext} ctx
   */
  async run(ctx) {
    if (!ctx.services.permission.isOwner(ctx.authorId)) {
      return ctx.message.reply(OWNER_ONLY);
    }

    const json = ctx.services.rule.exportJSON();
    const tmp = path.join(os.tmpdir(), `rules_${Date.now()}.json`);
    fs.writeFileSync(tmp, json, 'utf-8');

    const target = ctx.groupId || ctx.message.from;
    try {
      const media = MessageMedia.fromFilePath(tmp);
      await ctx.client.sendMessage(target, media, {
        sendMediaAsDocument: true,
        caption: '📜 Community Rules (rules.json)',
      });
      await ctx.message.reply('✅ Rules exported as a file above.');
    } catch (err) {
      ctx.logger.error('exportrules failed', { error: err.message });
      await ctx.message.reply('⚠️ Could not send the rules file.');
    } finally {
      fs.unlink(tmp, () => {});
    }
  },
};
