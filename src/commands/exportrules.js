import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import wa from 'whatsapp-web.js';
import { successText, errorText, OWNER_ONLY } from './messages.js';

const { MessageMedia } = wa;

export default {
 name: 'exportrules',
 description: 'Export the rules file as a downloadable document (owner only).',
 adminOnly: true,
 usage: '',
 async run(ctx) {
 if (!ctx.services.permission.isOwner(ctx.authorId)) return ctx.message.reply(OWNER_ONLY);
 const json = ctx.services.rule.exportJSON();
 const tmp = path.join(os.tmpdir(), `rules_${Date.now()}.json`);
 fs.writeFileSync(tmp, json, 'utf-8');
 const target = ctx.groupId || ctx.message.from;
 try {
 const media = MessageMedia.fromFilePath(tmp);
 await ctx.client.sendMessage(target, media, { sendMediaAsDocument: true, caption: '📜 Guardian Rules\n━━━━━━━━━━━━━━\nrules.json\n━━━━━━━━━━━━━━' });
 await ctx.message.reply(successText('Rules exported', 'Completed', 'The rules.json document was sent above.'));
 } catch (err) {
 ctx.logger.error('exportrules failed', { error: err.message });
 await ctx.message.reply(errorText('Could not send the rules file.', 'Check file access and try again.'));
 } finally {
 fs.unlink(tmp, () => {});
 }
 },
};
