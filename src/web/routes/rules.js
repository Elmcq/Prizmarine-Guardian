/**
 * @file Rule management routes (delegates to RuleService).
 * GET    /api/rules        -> list all rules
 * POST   /api/rules        -> add a rule { id, title, description, punishment }
 * PUT    /api/rules/:id    -> edit a field { field, value }
 * DELETE /api/rules/:id    -> delete a rule
 * Validation errors from RuleService are surfaced as 400.
 */
import express from 'express';

export function rulesRouter({ services }) {
  const router = express.Router();
  const svc = services.rule;

  router.get('/', (req, res) => {
    res.json(svc.listRules());
  });

  router.post('/', async (req, res) => {
    try {
      const { id, title, description, punishment } = req.body || {};
      const created = await svc.addRule(
        { id, title, description, punishment },
        'dashboard',
      );
      res.status(201).json(created);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.put('/:id', async (req, res) => {
    try {
      const { field, value } = req.body || {};
      const updated = await svc.editRule(req.params.id, field, value, 'dashboard');
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const deleted = await svc.deleteRule(req.params.id, 'dashboard');
      res.json(deleted);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}
