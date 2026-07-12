/**
 * @file BadwordRepository — reads the toxicity word lists (data/badwords.json).
 * The data is loaded once at startup by ToxicityService; `reload()` can be
 * used after the file is edited on disk without restarting the process.
 */

export class BadwordRepository {
  /**
   * @param {import('../DatabaseService.js').DatabaseService} dbService
   */
  constructor(dbService) {
    this.dbService = dbService;
    this.db = dbService.badwords;
  }

  /** Re-read the badwords file from disk. */
  async reload() {
    await this.dbService.badwords.read();
    return this.getAll();
  }

  /**
   * @returns {{
   *   indonesian: string[],
   *   english: string[],
   *   slurs: string[],
   *   hateSpeech: string[],
   *   harassment: string[],
   *   spamInsults: string[],
   *   patterns: string[]
   * }}
   */
  getAll() {
    const d = this.db.data || {};
    return {
      indonesian: d.indonesian || [],
      english: d.english || [],
      slurs: d.slurs || [],
      hateSpeech: d.hateSpeech || [],
      harassment: d.harassment || [],
      spamInsults: d.spamInsults || [],
      patterns: d.patterns || [],
    };
  }
}

export default BadwordRepository;
