import express from 'express';

const INCIDENT_MODULES = ['nsfw', 'advertisement', 'raid', 'sticker'];

function clampLimit(raw, fallback) {
 const value = parseInt(raw, 10);
 if (!Number.isFinite(value)) return fallback;
 return Math.min(Math.max(value, 1), 500);
}

export function dataRouter({ repos }) {
 const router = express.Router();

 router.get('/incidents', (req, res) => {
 const module = String(req.query.module || 'nsfw');
 if (!INCIDENT_MODULES.includes(module)) return res.status(400).json({ error: 'Unknown module' });
 const limit = clampLimit(req.query.limit, 50);
 const items = (repos[module].getIncidents() || [])
 .slice()
 .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
 .slice(0, limit);
 res.json({ module, count: items.length, items });
 });

 router.get('/bans', (req, res) => {
 const items = repos.bans.all().slice(0, clampLimit(req.query.limit, 100));
 res.json({ count: items.length, items });
 });

 router.get('/warnings', (req, res) => {
 const items = repos.warnings.all().slice(0, clampLimit(req.query.limit, 100));
 res.json({ count: items.length, items });
 });

 router.get('/audit', (req, res) => {
 const items = repos.audit.all(clampLimit(req.query.limit, 100));
 res.json({ count: items.length, items });
 });

 return router;
}
