import express from 'express';

const INCIDENT_MODULES = ['nsfw', 'advertisement', 'raid', 'sticker'];

function clampLimit(raw, fallback) {
 const value = parseInt(raw, 10);
 if (!Number.isFinite(value)) return fallback;
 return Math.min(Math.max(value, 1), 500);
}

/**
 * Strip @c.us / @lid suffixes for display.
 * @param {string} id
 * @returns {string}
 */
function shortId(id) {
 if (!id) return '';
 return id.replace(/@.*$/, '');
}

export function dataRouter({ repos, contactResolver }) {
 const router = express.Router();

 router.get('/incidents', async (req, res) => {
  const module = String(req.query.module || 'nsfw');
  if (!INCIDENT_MODULES.includes(module)) return res.status(400).json({ error: 'Unknown module' });
  const limit = clampLimit(req.query.limit, 50);
  let items = (repos[module].getIncidents() || [])
   .slice()
   .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
   .slice(0, limit);

  if (contactResolver) {
   const ids = items.flatMap((i) => [i.user, i.group, i.moderator].filter(Boolean));
   const names = await contactResolver.resolveMany(ids);
   items = items.map((i) => ({
    ...i,
    user: names.get(i.user) || shortId(i.user),
    group: names.get(i.group) || shortId(i.group),
    moderator: names.get(i.moderator) || shortId(i.moderator),
   }));
  }
  res.json({ module, count: items.length, items });
 });

 router.get('/bans', async (req, res) => {
  let items = repos.bans.all().slice(0, clampLimit(req.query.limit, 100));
  if (contactResolver) {
   const ids = items.flatMap((b) => [b.userId, b.groupId].filter(Boolean));
   const names = await contactResolver.resolveMany(ids);
   items = items.map((b) => ({
    ...b,
    userId: names.get(b.userId) || shortId(b.userId),
    groupId: names.get(b.groupId) || shortId(b.groupId),
   }));
  }
  res.json({ count: items.length, items });
 });

 router.get('/warnings', async (req, res) => {
  let items = repos.warnings.all().slice(0, clampLimit(req.query.limit, 100));
  if (contactResolver) {
   const ids = items.flatMap((w) => [w.userId, w.groupId].filter(Boolean));
   const names = await contactResolver.resolveMany(ids);
   items = items.map((w) => ({
    ...w,
    userId: names.get(w.userId) || shortId(w.userId),
    groupId: names.get(w.groupId) || shortId(w.groupId),
   }));
  }
  res.json({ count: items.length, items });
 });

 router.get('/audit', (req, res) => {
  const items = repos.audit.all(clampLimit(req.query.limit, 100));
  res.json({ count: items.length, items });
 });

 return router;
}
