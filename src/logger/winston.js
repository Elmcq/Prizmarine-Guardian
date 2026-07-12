/**
 * @file Winston logger configuration.
 * Logs to the console (colourised) and to rolling-ish files under logs/.
 * The logger is also subscribed to the EventBus so that domain events
 * (warnings, bans, commands, connections, errors) are recorded centrally.
 */

import fs from 'node:fs';
import path from 'node:path';
import winston from 'winston';
import { LOG_DIR } from '../config/constants.js';
import { config } from '../config/env.js';

fs.mkdirSync(LOG_DIR, { recursive: true });

const { combine, timestamp, errors, printf, colorize, json } = winston.format;

/** Console formatter: `2026-07-12 10:00:00 [INFO] message {meta}`. */
const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ level, message, timestamp: ts }) => `${ts} [${level}] ${message}`),
);

/** File formatter: structured JSON with timestamp + stack traces. */
const fileFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  json(),
);

export const logger = winston.createLogger({
  level: config.logLevel,
  transports: [
    new winston.transports.Console({ format: consoleFormat, silent: false }),
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      format: fileFormat,
    }),
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      format: fileFormat,
    }),
  ],
  exitOnError: false,
});

export default logger;
