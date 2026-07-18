import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { DB_FILES, DEFAULTS, BACKUP_DIR } from '../config/constants.js';
import { logger } from '../logger/winston.js';

export class DatabaseService {
 constructor(opts = {}) {
 const { createFiles = true } = opts;
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
     audit: { file: DB_FILES.audit, defaults: DEFAULTS.audit },
    tickets: { file: DB_FILES.tickets, defaults: DEFAULTS.tickets },
    staff: { file: DB_FILES.staff, defaults: DEFAULTS.staff },
    islamic: { file: DB_FILES.islamic, defaults: DEFAULTS.islamic },
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
 this._writeQueues = new Map();
 }

 async init() {
 await Promise.all(Object.values(this.dbs).map((db) => db.read()));
 for (const db of Object.values(this.dbs)) {
 const defaults = DEFAULTS[db._name];
 db.data = { ...structuredClone(defaults), ...(db.data || {}) };
 }
 logger.info('Database initialised', { files: Object.keys(this.dbs) });
 }

 persist(db) {
 const file = db._file;
 const prev = this._writeQueues.get(file) || Promise.resolve();
 const next = prev
 .then(() => db.write())
 .catch((err) => logger.error('DB write failed', { file, error: err.message }));
 this._writeQueues.set(file, next.catch(() => {}));
 return next;
 }

 uuid() {
 return randomUUID();
 }

 get warnings() { return this.dbs.warnings; }
 get bans() { return this.dbs.bans; }
 get settings() { return this.dbs.settings; }
 get badwords() { return this.dbs.badwords; }
 get nsfw() { return this.dbs.nsfw; }
 get advertisement() { return this.dbs.advertisement; }
 get raid() { return this.dbs.raid; }
 get sticker() { return this.dbs.sticker; }
 get rules() { return this.dbs.rules; }
  get audit() { return this.dbs.audit; }
  get tickets() { return this.dbs.tickets; }
  get staff() { return this.dbs.staff; }
  get islamic() { return this.dbs.islamic; }
  get backupDir() { return BACKUP_DIR; }
}

export default DatabaseService;
