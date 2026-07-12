/**
 * @file BackupService — copies the JSON data files to a timestamped folder.
 * Older backups are pruned to keep at most `keep` snapshots.
 */

import fs from 'node:fs';
import path from 'node:path';
import { DB_FILES, BACKUP_DIR } from '../config/constants.js';
import { logger } from '../logger/winston.js';

export class BackupService {
  /**
   * @param {import('../database/DatabaseService.js').DatabaseService} dbService
   * @param {{ keep?: number }} [opts]
   */
  constructor(dbService, opts = {}) {
    this.dbService = dbService;
    this.keep = opts.keep ?? 14;
  }

  /** Create a timestamped backup and prune old ones. */
  backup() {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const targetDir = path.join(BACKUP_DIR, stamp);
    fs.mkdirSync(targetDir, { recursive: true });

    const files = Object.values(DB_FILES);
    let copied = 0;
    for (const file of files) {
      if (fs.existsSync(file)) {
        fs.copyFileSync(file, path.join(targetDir, path.basename(file)));
        copied += 1;
      }
    }

    this._prune();
    logger.info('Backup completed', { dir: targetDir, files: copied });
    return targetDir;
  }

  /** Remove oldest backup directories beyond the retention limit. */
  _prune() {
    try {
      if (!fs.existsSync(BACKUP_DIR)) return;
      const dirs = fs
        .readdirSync(BACKUP_DIR)
        .filter((name) => fs.statSync(path.join(BACKUP_DIR, name)).isDirectory())
        .sort(); // ISO timestamps sort lexicographically.
      const excess = dirs.length - this.keep;
      for (let i = 0; i < excess; i += 1) {
        fs.rmSync(path.join(BACKUP_DIR, dirs[i]), { recursive: true, force: true });
      }
    } catch (err) {
      logger.error('Backup prune failed', { error: err.message });
    }
  }
}

export default BackupService;
