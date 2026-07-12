/**
 * @file StickerService — detects sticker spam. This service ONLY detects; it
 * never warns or bans. Punishment is delegated to ModerationService by the
 * stickerHandler.
 *
 * Two per-user (not cross-user) detectors:
 *   - flood     : >= `maxStickers` stickers from ONE user within `timeWindow`.
 *   - duplicate : >= `duplicateLimit` IDENTICAL stickers in a row from ONE user
 *                 (matched by the sticker's file hash / content key).
 *
 * One group-wide detector (log-only — Anti Raid handles real group raids):
 *   - coordinated : many DIFFERENT users sending stickers in a short window.
 *                 This only produces a log event, never a warning/ban.
 *
 * All thresholds are loaded dynamically from data/sticker.json.
 */

export class StickerService {
  /**
   * @param {import('../database/repositories/StickerRepository.js').StickerRepository} stickerRepo
   */
  constructor(stickerRepo) {
    this.repo = stickerRepo;
    this.reload();
  }

  /** Reload configuration from the repository. */
  reload() {
    const s = this.repo.getSettings();
    this.enabled = s.enabled;
    this.maxStickers = s.maxStickers;
    this.timeWindowMs = (s.timeWindow || 15) * 1000;
    this.duplicateLimit = s.duplicateLimit;
    this.warnLimit = s.warnLimit;
    const co = s.coordinated || { minUsers: 5, windowSec: 10 };
    this.coordinatedMinUsers = co.minUsers;
    this.coordinatedWindowMs = (co.windowSec || 10) * 1000;

    // Transient in-memory buffers (reset on restart / reload).
    /** @type {Map<string, number[]>} userId -> timestamps */
    this.userStickers = new Map();
    /** @type {Map<string, {key:string|null, count:number}>} */
    this.userDup = new Map();
    /** @type {Map<string, Array<{userId:string, ts:number}>>} groupId -> entries */
    this.groupStickers = new Map();
  }

  /**
   * Record a sticker and detect any spam condition.
   * @param {object} p
   * @param {string} p.groupId
   * @param {string} p.userId
   * @param {string|null} p.stickerKey - content key (e.g. file hash); null if unknown.
   * @param {number} [p.now]
   * @returns {{ detected: boolean, type: 'flood'|'duplicate'|'coordinated'|null, userId: string, stickerKey: string|null }}
   */
  detect({ groupId, userId, stickerKey, now = Date.now() }) {
    const none = { detected: false, type: null, userId, stickerKey };
    if (!this.enabled || !groupId || !userId) return none;

    // ---- per-user flood ----
    let userArr = (this.userStickers.get(userId) || []).filter((t) => now - t <= this.timeWindowMs);
    userArr.push(now);
    const flood = userArr.length >= this.maxStickers;

    // ---- per-user consecutive duplicate ----
    let dup = this.userDup.get(userId) || { key: null, count: 0 };
    if (stickerKey && stickerKey === dup.key) dup.count += 1;
    else dup = { key: stickerKey, count: stickerKey ? 1 : 0 };
    const duplicate = Boolean(stickerKey) && dup.count >= this.duplicateLimit;

    // ---- group coordinated (log-only) ----
    let gArr = (this.groupStickers.get(groupId) || []).filter((e) => now - e.ts <= this.coordinatedWindowMs);
    gArr.push({ userId, ts: now });
    const distinctUsers = new Set(gArr.map((e) => e.userId)).size;
    const coordinated = distinctUsers >= this.coordinatedMinUsers;

    let result = none;
    if (duplicate) {
      // Reset the consecutive counter so the next identical sticker restarts.
      dup = { key: null, count: 0 };
      result = { detected: true, type: 'duplicate', userId, stickerKey };
    } else if (flood) {
      // Reset the flood window so the user starts fresh (no instant re-warn).
      userArr = [];
      result = { detected: true, type: 'flood', userId, stickerKey };
    } else if (coordinated) {
      result = { detected: true, type: 'coordinated', userId, stickerKey };
    }

    this.userStickers.set(userId, userArr);
    this.userDup.set(userId, dup);
    this.groupStickers.set(groupId, gArr);
    return result;
  }

  /**
   * Drop expired entries from every buffer (called by SchedulerService).
   * @param {number} [now]
   */
  pruneAll(now = Date.now()) {
    for (const [uid, arr] of this.userStickers) {
      const f = arr.filter((t) => now - t <= this.timeWindowMs);
      if (f.length) this.userStickers.set(uid, f);
      else this.userStickers.delete(uid);
    }
    for (const [gid, arr] of this.groupStickers) {
      const f = arr.filter((e) => now - e.ts <= this.coordinatedWindowMs);
      if (f.length) this.groupStickers.set(gid, f);
      else this.groupStickers.delete(gid);
    }
    // userDup holds only the last seen key/count; harmless to keep, but clear
    // stale entries for users with no recent activity.
    for (const [uid, d] of this.userDup) {
      if (!this.userStickers.has(uid)) this.userDup.delete(uid);
    }
  }
}

export default StickerService;
