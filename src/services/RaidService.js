/**
 * @file RaidService — the detection brain for the Anti Raid module.
 *
 * It ONLY tracks events and decides *whether* a raid is happening. Punishment
 * is delegated to ModerationService by the raidHandler. The service keeps
 * short-lived in-memory buffers (joins / messages / recent joiners / new-member
 * abuse signals) and a persisted Raid Mode state (data/raid.json).
 *
 * Four raid types are detected:
 *   1. mass_join      — many users join within a short window.
 *   2. message_raid   — a very high message volume within a short window.
 *   3. coordinated    — several DIFFERENT users sending near-identical
 *                       (promotional / abusive) messages.
 *   4. new_member_abuse — recent joiners immediately tripping another
 *                       moderation detector (toxic / nsfw / ad / spam / flood).
 *
 * "Increased moderation sensitivity" is implemented by lowering the count
 * thresholds for types 1–3 while Raid Mode is active (see SENSITIVITY).
 */

import { sanitize, textSimilarity } from '../utils/sanitize.js';

/** Maximum messages scanned for coordinated clustering (perf guard). */
const COORDINATED_SCAN_CAP = 500;

export class RaidService {
  /**
   * @param {import('../database/repositories/RaidRepository.js').RaidRepository} raidRepo
   */
  constructor(raidRepo) {
    this.repo = raidRepo;
    this.reload();
  }

  /** Reload configuration + persisted Raid Mode state from the repository. */
  reload() {
    const s = this.repo.getSettings();
    this.enabled = s.enabled;
    this.autoRaidMode = s.autoRaidMode;
    this.raidModeDurationMs = s.raidModeDurationMs;
    this.notifyAdmins = s.notifyAdmins;
    this.thresholds = s.thresholds;
    this.sensitivity = (s.sensitivity && s.sensitivity.raidMode) || {};

    // In-memory buffers (transient — reset on restart).
    /** @type {Map<string, Array<{userId:string, ts:number}>>} */
    this.joins = new Map();
    /** @type {Map<string, Array<{userId:string, norm:string, ts:number}>>} */
    this.messages = new Map();
    /** @type {Map<string, Map<string, number>>} groupId -> (userId -> joinTs) */
    this.recentJoiners = new Map();
    /** @type {Map<string, Array<{userId:string, ts:number, source:string}>>} */
    this.newMemberAbuse = new Map();

    // Restored Raid Mode state (persisted across restarts).
    this.raidMode = this.repo.getRaidModeMap() || {};
  }

  /** Longest window across all detectors — used to prune safely. */
  get maxWindowMs() {
    const t = this.thresholds || {};
    return Math.max(
      t.massJoin?.windowMs || 0,
      t.messageRaid?.windowMs || 0,
      t.coordinated?.windowMs || 0,
      t.newMemberAbuse?.windowMs || 0,
      60_000,
    );
  }

  // ---------------------------------------------------------------- tracking

  /**
   * Record a group join (from the `group_join` event).
   * @param {string} groupId
   * @param {string} userId
   * @param {number} [now]
   */
  trackJoin(groupId, userId, now = Date.now()) {
    if (!groupId || !userId) return;
    if (!this.joins.has(groupId)) this.joins.set(groupId, []);
    this.joins.get(groupId).push({ userId, ts: now });

    if (!this.recentJoiners.has(groupId)) this.recentJoiners.set(groupId, new Map());
    this.recentJoiners.get(groupId).set(userId, now);

    this.prune(groupId, now);
  }

  /**
   * Record an inbound message (for message-raid volume + coordinated spam).
   * @param {string} groupId
   * @param {string} userId
   * @param {string} body
   * @param {number} [now]
   */
  trackMessage(groupId, userId, body, now = Date.now()) {
    if (!groupId || !userId || !body) return;
    const norm = sanitize(body);
    if (!norm) return;
    if (!this.messages.has(groupId)) this.messages.set(groupId, []);
    this.messages.get(groupId).push({ userId, norm, ts: now });
    this.prune(groupId, now);
  }

  /**
   * Whether a user joined recently enough to count as a "new member".
   * @param {string} groupId
   * @param {string} userId
   * @param {number} [now]
   * @returns {boolean}
   */
  isRecentJoiner(groupId, userId, now = Date.now()) {
    const joinTs = this.recentJoiners.get(groupId)?.get(userId);
    if (!joinTs) return false;
    const window = this.thresholds?.newMemberAbuse?.windowMs || 60_000;
    return now - joinTs <= window;
  }

  /**
   * Signal that a recent joiner triggered another moderation detector.
   * Called by the raid handler when it hears a WARNING_ISSUED for a new member.
   * @param {string} groupId
   * @param {string} userId
   * @param {string} source - toxic|nsfw|advertisement|spam|flood
   * @param {number} [now]
   */
  signalNewMemberAbuse(groupId, userId, source, now = Date.now()) {
    if (!this.isRecentJoiner(groupId, userId, now)) return;
    if (!this.newMemberAbuse.has(groupId)) this.newMemberAbuse.set(groupId, []);
    this.newMemberAbuse.get(groupId).push({ userId, ts: now, source });
    this.prune(groupId, now);
  }

  // --------------------------------------------------------- raid mode state

  /**
   * Enable or disable Raid Mode for a group (persisted).
   * @param {string} groupId
   * @param {boolean} active
   * @param {number} [now]
   * @returns {Promise<{active:boolean, since:number|null, until:number|null}>}
   */
  async setRaidMode(groupId, active, now = Date.now()) {
    const state = active
      ? { active: true, since: now, until: now + (this.raidModeDurationMs || 300_000) }
      : { active: false, since: null, until: null };
    this.raidMode[groupId] = state;
    await this.repo.setRaidMode(groupId, state);
    return state;
  }

  /**
   * Whether Raid Mode is currently active (auto-expires past its until time).
   * @param {string} groupId
   * @param {number} [now]
   * @returns {boolean}
   */
  isRaidMode(groupId, now = Date.now()) {
    const st = this.raidMode[groupId];
    if (!st || !st.active) return false;
    if (st.until && now >= st.until) {
      // Fire-and-forget expiry (persists).
      this.setRaidMode(groupId, false, now).catch(() => {});
      return false;
    }
    return true;
  }

  /**
   * Expire any Raid Modes whose `until` has passed (called by SchedulerService).
   * @param {number} [now]
   * @returns {Promise<string[]>} group ids that were expired.
   */
  async expireRaidModes(now = Date.now()) {
    const expired = [];
    for (const [groupId, st] of Object.entries(this.raidMode)) {
      if (st && st.active && st.until && now >= st.until) {
        await this.setRaidMode(groupId, false, now);
        expired.push(groupId);
      }
    }
    return expired;
  }

  // ----------------------------------------------------------- thresholds

  /**
   * Effective thresholds, lowered while Raid Mode is active ("increased
   * sensitivity"). Count thresholds are multiplied by the configured
   * multiplier (min 1); the time windows are unchanged.
   * @param {string} groupId
   * @param {number} [now]
   */
  getEffectiveThresholds(groupId, now = Date.now()) {
    const t = this.thresholds || {};
    const active = this.isRaidMode(groupId, now);
    const mult = (k) => {
      if (!active) return 1;
      const m = Number(this.sensitivity[k]);
      return Number.isFinite(m) && m > 0 ? m : 1;
    };
    const apply = (base, key) => {
      const n = Math.floor((base || 0) * mult(key));
      return Math.max(1, n);
    };
    return {
      massJoin: {
        count: apply(t.massJoin?.count, 'massJoinMultiplier'),
        windowMs: t.massJoin?.windowMs || 60_000,
      },
      messageRaid: {
        count: apply(t.messageRaid?.count, 'messageRaidMultiplier'),
        windowMs: t.messageRaid?.windowMs || 30_000,
      },
      coordinated: {
        minUsers: Math.max(2, apply(t.coordinated?.minUsers || 3, 'coordinatedMultiplier')),
        windowMs: t.coordinated?.windowMs || 15_000,
        similarity: t.coordinated?.similarity ?? 0.8,
      },
      newMemberAbuse: {
        windowMs: t.newMemberAbuse?.windowMs || 60_000,
        minCount: t.newMemberAbuse?.minCount ?? 1,
      },
    };
  }

  // ------------------------------------------------------------ detection

  /**
   * Detect a coordinated spam cluster: several DISTINCT users sending
   * near-identical messages within the window.
   * @param {Array<{userId:string, norm:string, ts:number}>} msgs
   * @param {number} minUsers
   * @param {number} similarity
   * @returns {{ triggered: boolean, users: Set<string> }}
   */
  detectCoordinated(msgs, minUsers, similarity) {
    if (!msgs || msgs.length < minUsers) return { triggered: false, users: new Set() };
    const scan = msgs.slice(-COORDINATED_SCAN_CAP);
    const clusters = []; // { rep:string, users:Set<string> }
    for (const m of scan) {
      if (!m.norm) continue;
      let placed = false;
      for (const c of clusters) {
        if (textSimilarity(c.rep, m.norm) >= similarity) {
          c.users.add(m.userId);
          placed = true;
          break;
        }
      }
      if (!placed) clusters.push({ rep: m.norm, users: new Set([m.userId]) });
    }
    let best = null;
    for (const c of clusters) {
      if (c.users.size >= minUsers && (!best || c.users.size > best.users.size)) {
        best = c;
      }
    }
    return best ? { triggered: true, users: best.users } : { triggered: false, users: new Set() };
  }

  /**
   * Evaluate all raid detectors for a group against the (effective) thresholds.
   * @param {string} groupId
   * @param {number} [now]
   * @returns {{ types: string[], coordinatedUsers: Set<string> }}
   */
  evaluate(groupId, now = Date.now()) {
    if (!this.enabled) return { types: [], coordinatedUsers: new Set() };
    const t = this.getEffectiveThresholds(groupId, now);
    const types = [];
    let coordinatedUsers = new Set();

    // 1) Mass join
    const joins = (this.joins.get(groupId) || []).filter((j) => now - j.ts <= t.massJoin.windowMs);
    if (joins.length >= t.massJoin.count) types.push('mass_join');

    // 2) Message raid
    const msgs = (this.messages.get(groupId) || []).filter((m) => now - m.ts <= t.messageRaid.windowMs);
    if (msgs.length >= t.messageRaid.count) types.push('message_raid');

    // 3) Coordinated spam
    const coMsgs = (this.messages.get(groupId) || []).filter(
      (m) => now - m.ts <= t.coordinated.windowMs,
    );
    const co = this.detectCoordinated(coMsgs, t.coordinated.minUsers, t.coordinated.similarity);
    if (co.triggered) {
      types.push('coordinated');
      coordinatedUsers = co.users;
    }

    // 4) New member abuse
    const abuse = (this.newMemberAbuse.get(groupId) || []).filter(
      (a) => now - a.ts <= t.newMemberAbuse.windowMs,
    );
    if (abuse.length >= (t.newMemberAbuse.minCount || 1)) types.push('new_member_abuse');

    return { types, coordinatedUsers };
  }

  // --------------------------------------------------------------- pruning

  /**
   * Drop expired entries from a group's buffers.
   * @param {string} groupId
   * @param {number} [now]
   */
  prune(groupId, now = Date.now()) {
    const max = this.maxWindowMs;
    if (this.joins.has(groupId)) {
      this.joins.set(groupId, this.joins.get(groupId).filter((j) => now - j.ts <= max));
    }
    if (this.messages.has(groupId)) {
      this.messages.set(groupId, this.messages.get(groupId).filter((m) => now - m.ts <= max));
    }
    if (this.newMemberAbuse.has(groupId)) {
      this.newMemberAbuse.set(
        groupId,
        this.newMemberAbuse.get(groupId).filter((a) => now - a.ts <= max),
      );
    }
    const rj = this.recentJoiners.get(groupId);
    if (rj) {
      for (const [uid, ts] of rj) {
        if (now - ts > max) rj.delete(uid);
      }
    }
  }

  /** Prune every group's buffers (called periodically by SchedulerService). */
  pruneAll(now = Date.now()) {
    for (const g of this.joins.keys()) this.prune(g, now);
  }
}

export default RaidService;
