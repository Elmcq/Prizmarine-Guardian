import { ISLAMIC_CONFIG } from '../../config/islamic.config.js';
import { EVENTS } from '../../config/constants.js';

const BLOCKED_DURING_PRAYER = /^!/;
const EXCEPTIONS = ['!sholat', '!hijri', '!qibla', '!prayermode', '!islamic', '!warn', '!kick', '!ban'];

export class PrayerModeService {
  constructor({ repo, logger, eventBus }) {
    this.repo = repo;
    this.logger = logger;
    this.eventBus = eventBus;
    this.activeSessions = new Map();
  }

  isActive(groupId) {
    return this.activeSessions.has(groupId);
  }

  startSession(groupId, durationMinutes = 30) {
    const timeout = setTimeout(() => this.endSession(groupId), durationMinutes * 60_000);
    this.activeSessions.set(groupId, { timeout, startedAt: Date.now() });
    this.eventBus.emit(EVENTS.PRAYER_MODE_TOGGLED, { groupId, enabled: true, duration: durationMinutes });
    this.logger.info('Prayer mode started', { groupId, duration: durationMinutes });
  }

  endSession(groupId) {
    const session = this.activeSessions.get(groupId);
    if (session) {
      clearTimeout(session.timeout);
      this.activeSessions.delete(groupId);
      this.eventBus.emit(EVENTS.PRAYER_MODE_TOGGLED, { groupId, enabled: false });
      this.logger.info('Prayer mode ended', { groupId });
    }
  }

  shouldBlock(groupId, commandName) {
    if (!this.isActive(groupId)) return false;
    if (EXCEPTIONS.some((e) => e === `!${commandName}`)) return false;
    return true;
  }

  shouldBlockMessage(groupId, body) {
    if (!this.isActive(groupId)) return false;
    if (!body.startsWith('!')) return false;
    const cmd = body.split(/\s+/)[0];
    if (EXCEPTIONS.includes(cmd)) return false;
    return true;
  }
}

export default PrayerModeService;
