/**
 * !memory — show process memory usage. Admin only.
 */

export default {
  name: 'memory',
  description: 'Show current memory usage.',
  adminOnly: true,
  usage: '',
  /**
   * @param {import('./index.js').CommandContext} ctx
   */
  async run(ctx) {
    const m = process.memoryUsage();
    const mb = (b) => `${(b / 1024 / 1024).toFixed(2)} MB`;
    const lines = [
      '🧠 *Memory Usage*',
      '',
      `RSS: ${mb(m.rss)}`,
      `Heap total: ${mb(m.heapTotal)}`,
      `Heap used: ${mb(m.heapUsed)}`,
      `External: ${mb(m.external)}`,
      `Array buffers: ${mb(m.arrayBuffers)}`,
    ];
    await ctx.message.reply(lines.join('\n'));
  },
};
