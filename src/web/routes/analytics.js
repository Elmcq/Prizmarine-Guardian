import express from 'express';

export function analyticsRouter({ analyticsService, logger }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const range = String(req.query.range || 'all');
    const validRanges = ['today', '7d', '30d', 'all'];
    if (!validRanges.includes(range)) {
      return res.status(400).json({ error: 'Invalid range. Use: today, 7d, 30d, all' });
    }
    res.json(analyticsService.getOverview(range));
  });

  router.get('/violations', (req, res) => {
    const range = String(req.query.range || 'all');
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    res.json(analyticsService.getTopViolations(range, limit));
  });

  router.get('/user/:userId', (req, res) => {
    const userId = req.params.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const profile = analyticsService.getUserProfile(userId);
    if (!profile) return res.status(404).json({ error: 'User not found' });
    res.json(profile);
  });

  router.get('/incidents/:module', (req, res) => {
    const module = req.params.module;
    const validModules = ['toxicity', 'nsfw', 'advertisement', 'raid', 'sticker'];
    if (!validModules.includes(module)) {
      return res.status(400).json({ error: 'Unknown module' });
    }
    const range = String(req.query.range || 'all');
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    try {
      const result = analyticsService.getEnhancedIncidents(module, range, limit);
      logger?.debug?.('incidents query', { module, range, limit, count: result.length });
      res.json(result);
    } catch (err) {
      logger?.error?.('getEnhancedIncidents failed', { module, range, error: err.message });
      res.json([]);
    }
  });

  return router;
}
