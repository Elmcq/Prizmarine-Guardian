/**
 * @file Read-only data routes for the dashboard (monitoring only).
 * GET /api/data/incidents?module=nsfw&limit=50  -> recent incidents (newest first)
 * GET /api/data/bans?limit=100                   -> active + historical bans
 * GET /api/data/warnings?limit=100               -> current warning records
 */
import express from 'express';

const INCIDENT_MODULES = ['nsfw', 'advertisement', 'raid', 'sticker'];

function clampLimit(raw, fallback) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, 1), 500);
}

export function dataRouter({ repos }) {
  const router = express.Router();

  router.get('/incidents', (req, res) => {
    const module = String(req.query.module || 'nsfw');
    if (!INCIDENT_MODULES.includes(module)) {
      return res.status(400).json({ error: 'Unknown module' });
    }
    const repo = repos[module];
    const limit = clampLimit(req.query.limit, 50);
    const items = (repo.getIncidents() || [])
      .slice()
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, limit);
    res.json({ module, count: items.length, items });
  });

  router.get('/bans', (req, res) => {
    const limit = clampLimit(req.query.limit, 100);
    const items = repos.bans.all().slice(0, limit);
    res.json({ count: items.length, items });
  });

  router.get('/warnings', (req, res) => {
    const limit = clampLimit(req.query.limit, 100);
    const items = repos.warnings.all().slice(0, limit);
    res.json({ count: items.length, items });
  });

  return router;
}
