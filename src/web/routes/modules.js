/**
 * @file Module management routes.
 * GET  /api/modules        -> list all modules (state, settings, stats, fields)
 * PUT  /api/modules/:key   -> toggle `enabled` and/or edit settings, then
 *                              reload the running service so changes apply now.
 */
import express from 'express';
import { MODULE_KEYS, MODULE_SCHEMAS, pickEditable } from '../schemas.js';

export function modulesRouter({ repos, services }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const list = MODULE_KEYS.map((key) => {
      const repo = repos[key];
      return {
        key,
        label: MODULE_SCHEMAS[key].label,
        enabled: repo.isEnabled(),
        settings: repo.getSettings(),
        stats: repo.getStats(),
        fields: MODULE_SCHEMAS[key].fields,
      };
    });
    res.json(list);
  });

  router.put('/:key', async (req, res) => {
    const key = req.params.key;
    const schema = MODULE_SCHEMAS[key];
    if (!schema) return res.status(404).json({ error: 'Unknown module' });

    const repo = repos[key];
    const body = req.body || {};

    // Toggle on/off (handled by the repo's dedicated setter).
    if (body.enabled !== undefined) {
      await repo.setEnabled(Boolean(body.enabled));
    }

    // Edit other settings through the repo's updateSettings() (validates +
    // coerces + persists), then reload the live service so the change is
    // honoured immediately — mirrors the `!antinsfw` etc. command pattern.
    const partial = pickEditable(key, body);
    if (partial && Object.keys(partial).length > 0) {
      await repo.updateSettings(partial);
    }

    const svc = services[key];
    if (svc && typeof svc.reload === 'function') svc.reload();

    res.json({
      ok: true,
      key,
      enabled: repo.isEnabled(),
      settings: repo.getSettings(),
    });
  });

  return router;
}
