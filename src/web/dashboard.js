import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAuth } from './auth.js';
import { overviewRouter } from './routes/overview.js';
import { modulesRouter } from './routes/modules.js';
import { rulesRouter } from './routes/rules.js';
import { dataRouter } from './routes/data.js';
import { settingsRouter } from './routes/settings.js';
import { analyticsRouter } from './routes/analytics.js';
import { exportRouter } from './routes/export.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '..', '..', 'public');

export function createDashboard({ repos, services, config, logger, eventBus, contactResolver, analyticsService, exportService }) {
 const app = express();
 app.use(express.json({ limit: '64kb' }));
 const auth = createAuth(config.dashboardToken);
 app.post('/api/auth/login', auth.login);
 app.post('/api/auth/logout', auth.logout);
 app.get('/api/auth/me', auth.requireAuth, (req, res) => res.json({ authed: true }));
 app.use('/api', auth.requireAuth);
 app.use('/api/overview', overviewRouter({ repos, services, config, contactResolver }));
 app.use('/api/modules', modulesRouter({ repos, services, eventBus }));
 app.use('/api/rules', rulesRouter({ services }));
 app.use('/api/settings', settingsRouter({ repos, config, eventBus }));
 app.use('/api/data', dataRouter({ repos, contactResolver }));
 app.use('/api/analytics', analyticsRouter({ analyticsService }));
 app.use('/api/export', exportRouter({ exportService }));
 app.use(express.static(PUBLIC_DIR));
 app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));
 app.use((err, req, res, next) => {
 logger?.error?.('Dashboard request error', { error: err.message });
 res.status(500).json({ error: 'Internal error' });
 });
 return app;
}
