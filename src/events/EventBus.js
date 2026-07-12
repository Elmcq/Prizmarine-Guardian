/**
 * @file Application-wide event bus.
 * A thin wrapper around Node's EventEmitter used to decouple domain
 * actions (issued warnings, bans, commands, connections, errors) from
 * the logger and any future listeners.
 */

import { EventEmitter } from 'node:events';

class EventBus extends EventEmitter {
  constructor() {
    super();
    // Avoid crashing the process on unhandled event errors.
    this.on('error', () => {});
  }
}

/** Singleton event bus shared by the whole application. */
export const eventBus = new EventBus();

export default eventBus;
