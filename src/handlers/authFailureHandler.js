/**
 * @file authFailureHandler — handles connection-level events and attempts
 * to automatically reconnect on transient disconnects.
 */

import { EVENTS } from '../config/constants.js';

/** Module-scoped guard so we never stack multiple reconnect timers. */
let reconnectTimer = null;

/**
 * Schedule a single reconnect attempt with a fixed delay.
 * @param {import('whatsapp-web.js').Client} client
 * @param {import('winston').Logger} logger
 */
function scheduleReconnect(client, logger) {
  if (reconnectTimer) return;
  const delay = 5000;
  logger.info(`Scheduling reconnect in ${delay / 1000}s...`);
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    try {
      logger.info('Attempting to reconnect...');
      await client.initialize();
      logger.info('Reconnect initialised.');
    } catch (err) {
      logger.error('Reconnect failed', { error: err.message });
      scheduleReconnect(client, logger);
    }
  }, delay);
}

/**
 * @param {object} deps
 * @param {import('whatsapp-web.js').Client} deps.client
 * @param {import('winston').Logger} deps.logger
 * @param {import('../events/EventBus.js').EventBus} deps.eventBus
 */
export function registerConnectionHandlers({ client, logger, eventBus }) {
  client.on('auth_failure', (msg) => {
    logger.error('Authentication failure', { msg });
    eventBus.emit(EVENTS.ERROR, { type: 'auth_failure', msg });
  });

  client.on('disconnected', (reason) => {
    logger.warn('WhatsApp disconnected', { reason });
    eventBus.emit(EVENTS.CONNECTION, { state: 'disconnected', reason });

    // LOGOUT means the session was intentionally removed — don't auto-reconnect.
    if (reason === 'LOGOUT') {
      logger.error('Session logged out. Delete the .wwebjs_auth folder and re-scan the QR to reconnect.');
      return;
    }
    scheduleReconnect(client, logger);
  });
}

export default registerConnectionHandlers;
