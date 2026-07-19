import express from 'express';

const INCIDENT_MODULES = ['toxicity', 'nsfw', 'advertisement', 'raid', 'sticker'];

function clampLimit(raw, fallback) {
 const value = parseInt(raw, 10);
 if (!Number.isFinite(value)) return fallback;
 return Math.min(Math.max(value, 1), 500);
}

 async function enrich(items, fields, resolver, logger) {
 if (!resolver) return items;
 const ids = items.flatMap((item) => fields.map((field) => item[field]).filter(Boolean));
 if (ids.length === 0) return items;
 
 try {
 const names = await resolver.resolveMany(ids);
 return items.map((item) => {
 const enriched = { ...item };
 for (const field of fields) {
 if (!item[field]) continue;
 enriched[`${field}Raw`] = item[field];
 enriched[field] = names.get(item[field]) || resolver.formatFallback(item[field]);
 }
 return enriched;
 });
 } catch (err) {
 if (logger) logger.debug('Enrich failed, returning un-enriched data', { error: err.message });
 return items.map((item) => {
 const enriched = { ...item };
 for (const field of fields) {
 if (!item[field]) continue;
 enriched[`${field}Raw`] = item[field];
 enriched[field] = resolver.formatFallback(item[field]);
 }
 return enriched;
 });
 }
 }

export function dataRouter({ repos, contactResolver, logger }) {
 const router = express.Router();

 router.get('/incidents', async (req, res) => {
 const module = String(req.query.module || 'nsfw');
 if (!INCIDENT_MODULES.includes(module)) return res.status(400).json({ error: 'Unknown module' });
 const items = (repos[module].getIncidents() || [])
 .slice()
 .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
 .slice(0, clampLimit(req.query.limit, 50));
 const resolved = await enrich(items, ['user', 'group', 'moderator'], contactResolver, logger);
 res.json({ module, count: resolved.length, items: resolved });
 });

 router.get('/bans', async (req, res) => {
 const items = repos.bans.all().slice(0, clampLimit(req.query.limit, 100));
 const resolved = await enrich(items, ['userId', 'groupId'], contactResolver, logger);
 res.json({ count: resolved.length, items: resolved });
 });

 router.get('/warnings', async (req, res) => {
 const items = repos.warnings.all().slice(0, clampLimit(req.query.limit, 100));
 const resolved = await enrich(items, ['userId', 'groupId'], contactResolver, logger);
 res.json({ count: resolved.length, items: resolved });
 });

 router.get('/audit', async (req, res) => {
 const items = repos.audit.all(clampLimit(req.query.limit, 100));
 const resolved = await enrich(items, ['user', 'moderator', 'groupId'], contactResolver, logger);
 res.json({ count: resolved.length, items: resolved });
 });

 return router;
}
