/**
 * @file Dashboard application factory.
 *
 * Builds an Express app that serves the JSON API (owner-authenticated) and the
 * static `public/` UI. Intentionally thin: all logic lives in the route
 * modules and reuses the bot's existing repos/services. Created inside
 * `bootstrap()` once those objects exist, and closed in `shutdown()`.
 *
 * @param {object} deps
 * @param {object} deps.repos
 * @param {object} deps.services
 * @param {object} deps.config
 * @param {object} deps.logger
 * @param {object} deps.eventBus
 * @returns {import('express').Express}
 */
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAuth } from './auth.js';
import { overviewRouter } from './routes/overview.js';
import { modulesRouter } from './routes/modules.js';
import { rulesRouter } from './routes/rules.js';
import { dataRouter } from './routes/data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '..', '..', 'public');

export function createDashboard({ repos, services, config, logger, eventBus }) {
  const app = express();
  app.use(express.json());

  const auth = createAuth(config.dashboardToken);

  // --- Auth routes (NOT protected) ---
  app.post('/api/auth/login', auth.login);
  app.post('/api/auth/logout', auth.logout);
  app.get('/api/auth/me', auth.requireAuth, (req, res) => res.json({ authed: true }));

  // --- Protect every other /api route ---
  app.use('/api', auth.requireAuth);

  app.use('/api/overview', overviewRouter({ repos, services, config }));
  app.use('/api/modules', modulesRouter({ repos, services }));
  app.use('/api/rules', rulesRouter({ services }));
  app.use('/api/data', dataRouter({ repos }));

  // --- Static UI + SPA fallback (anything not under /api) ---
  app.use(express.static(PUBLIC_DIR));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  // --- JSON error handler ---
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    logger?.error?.('Dashboard request error', { error: err.message });
    res.status(500).json({ error: 'Internal error' });
  });

  return app;
}
