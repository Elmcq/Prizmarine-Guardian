import { panelText } from './messages.js';

export default {
 name: 'memory',
 description: 'Show current memory usage.',
 adminOnly: true,
 usage: '',
 async run(ctx) {
 const m = process.memoryUsage();
 const mb = (b) => `${(b / 1024 / 1024).toFixed(2)} MB`;
 await ctx.message.reply(panelText('System Memory', [`RSS: ${mb(m.rss)}`, `Heap total: ${mb(m.heapTotal)}`, `Heap used: ${mb(m.heapUsed)}`, `External: ${mb(m.external)}`, `Array buffers: ${mb(m.arrayBuffers)}`], '📊'));
 },
};
