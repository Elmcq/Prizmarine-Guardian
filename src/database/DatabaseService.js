/**
 * @file DatabaseService — JSON persistence abstraction over lowdb.
 *
 * Responsibilities:
 *  - Lazily create the four JSON files if missing.
 *  - Hold one `Low` instance per file.
 *  - Serialise writes per file through a promise queue so concurrent
 *    `db.write()` calls never interleave and corrupt the file.
 *
 * Repositories build on top of this service (see ./repositories).
 */

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { DB_FILES, DEFAULTS, BACKUP_DIR } from '../config/constants.js';
import { logger } from '../logger/winston.js';

export class DatabaseService {
  /**
   * @param {object} [opts]
   * @param {boolean} [opts.createFiles=true] - Pre-create JSON files if absent.
   */
  constructor(opts = {}) {
    const { createFiles = true } = opts;

    /** @type {Record<string, Low>} Map of logical name -> Low instance. */
    this.dbs = {};

    const definitions = {
      warnings: { file: DB_FILES.warnings, defaults: DEFAULTS.warnings },
      bans: { file: DB_FILES.bans, defaults: DEFAULTS.bans },
      settings: { file: DB_FILES.settings, defaults: DEFAULTS.settings },
      badwords: { file: DB_FILES.badwords, defaults: DEFAULTS.badwords },
      nsfw: { file: DB_FILES.nsfw, defaults: DEFAULTS.nsfw },
      advertisement: { file: DB_FILES.advertisement, defaults: DEFAULTS.advertisement },
      raid: { file: DB_FILES.raid, defaults: DEFAULTS.raid },
      sticker: { file: DB_FILES.sticker, defaults: DEFAULTS.sticker },
      rules: { file: DB_FILES.rules, defaults: DEFAULTS.rules },
    };

    for (const [name, { file, defaults }] of Object.entries(definitions)) {
      const dir = path.dirname(file);
      fs.mkdirSync(dir, { recursive: true });
      if (createFiles && !fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify(defaults, null, 2), 'utf-8');
      }
      const adapter = new JSONFile(file);
      const db = new Low(adapter, structuredClone(defaults));
      db._file = file;
      db._name = name;
      this.dbs[name] = db;
    }

    /** @private Per-file promise chains that serialise writes. */
    this._writeQueues = new Map();
    this._uuid = randomUUID;
  }

  /** Read all files from disk into memory. Call once at startup. */
  async init() {
    await Promise.all(Object.values(this.dbs).map((db) => db.read()));
    // Defensive: ensure each data object has the expected shape.
    for (const db of Object.values(this.dbs)) {
      const defaults = DEFAULTS[db._name];
      db.data = { ...structuredClone(defaults), ...(db.data || {}) };
    }
    logger.info('Database initialised', { files: Object.keys(this.dbs) });
  }

  /**
   * Persist a single Low instance, serialising writes for that file.
   * @param {Low} db
   * @returns {Promise<void>}
   */
  persist(db) {
    const file = db._file;
    const prev = this._writeQueues.get(file) || Promise.resolve();
    const next = prev
      .then(() => db.write())
      .catch((err) => logger.error('DB write failed', { file, error: err.message }));
    // Keep the chain alive even if one write rejected.
    this._writeQueues.set(file, next.catch(() => {}));
    return next;
  }

  /** Generate a UUID (used by repositories for stable record ids). */
  uuid() {
    return randomUUID();
  }

  get warnings() {
    return this.dbs.warnings;
  }

  get bans() {
    return this.dbs.bans;
  }

  get settings() {
    return this.dbs.settings;
  }

  get badwords() {
    return this.dbs.badwords;
  }

  get nsfw() {
    return this.dbs.nsfw;
  }

  get advertisement() {
    return this.dbs.advertisement;
  }

  get raid() {
    return this.dbs.raid;
  }

  get sticker() {
    return this.dbs.sticker;
  }

  get rules() {
    return this.dbs.rules;
  }

  /** Absolute path to the backups directory. */
  get backupDir() {
    return BACKUP_DIR;
  }
}

export default DatabaseService;
