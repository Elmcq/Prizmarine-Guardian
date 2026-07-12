/**
 * @file PermissionService — a single, reusable facade over the project's
 * privilege-resolution helpers in `middleware/authMiddleware.js`.
 *
 * Several features (rule management, moderation commands) need to ask
 * "is this user the owner?" or "are they at least a group admin?". Rather than
 * each command import `authMiddleware` directly and re-derive the answer, they
 * go through this service. It deliberately contains no logic of its own — it
 * reuses the existing, tested resolution functions.
 */

import {
  isOwner,
  isGroupAdmin,
  canRunAdminCommand,
  shouldModerate,
} from '../middleware/authMiddleware.js';

export class PermissionService {
  /**
   * @param {object} deps
   * @param {import('../config/env.js').config} deps.config
   * @param {import('whatsapp-web.js').Client} [deps.client]
   */
  constructor({ config, client = null }) {
    this.config = config;
    this.client = client;
  }

  /** Inject the WhatsApp client (available after construction in index.js). */
  setClient(client) {
    this.client = client;
  }

  /** Whether `userId` is the configured owner. */
  isOwner(userId) {
    return isOwner(userId, this.config.owner);
  }

  /** Whether `userId` is an admin of `chat` (async; needs the client). */
  async isAdmin(userId, chat) {
    if (!this.client) return false;
    return isGroupAdmin(this.client, chat, userId);
  }

  /**
   * Owner, or a group admin of `chat`.
   * @param {string} userId
   * @param {object} [chat]
   * @returns {Promise<boolean>}
   */
  async isModerator(userId, chat) {
    if (this.isOwner(userId)) return true;
    if (chat && this.client) return isGroupAdmin(this.client, chat, userId);
    return false;
  }

  /** Whether `authorId` may run an admin-only command (owner always passes). */
  async canRunAdminCommand({ chat, authorId }) {
    return canRunAdminCommand({ client: this.client, chat, authorId, config: this.config });
  }

  /** Whether `authorId` should be subject to automatic moderation. */
  async shouldModerate(ctx) {
    return shouldModerate({ ...ctx, client: this.client, config: this.config });
  }
}

export default PermissionService;
