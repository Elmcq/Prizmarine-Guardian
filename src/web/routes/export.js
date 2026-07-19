import express from 'express';

export function exportRouter({ exportService }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const range = String(req.query.range || 'all');
    const format = String(req.query.format || 'json');
    const validRanges = ['today', '7d', '30d', 'all'];
    if (!validRanges.includes(range)) {
      return res.status(400).json({ error: 'Invalid range' });
    }

    if (format === 'csv') {
      const csv = exportService.toCSV(range);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="prizmarine-report-${range}-${Date.now()}.csv"`);
      return res.send(csv);
    }

    const json = exportService.toJSON(range);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="prizmarine-report-${range}-${Date.now()}.json"`);
    return res.send(json);
  });

  return router;
}
