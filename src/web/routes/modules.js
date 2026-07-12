import express from 'express';
import { EVENTS } from '../../config/constants.js';
import { MODULE_KEYS, MODULE_SCHEMAS, pickEditable } from '../schemas.js';

export function modulesRouter({ repos, services, eventBus }) {
 const router = express.Router();

 router.get('/', (req, res) => {
 res.json(MODULE_KEYS.map((key) => ({
 key,
 label: MODULE_SCHEMAS[key].label,
 enabled: repos[key].isEnabled(),
 settings: repos[key].getSettings(),
 stats: repos[key].getStats(),
 fields: MODULE_SCHEMAS[key].fields,
 })));
 });

 router.put('/:key', async (req, res) => {
 const key = req.params.key;
 if (!MODULE_SCHEMAS[key]) return res.status(404).json({ error: 'Unknown module' });
 const repo = repos[key];
 const before = { enabled: repo.isEnabled(), settings: repo.getSettings() };
 const body = req.body || {};
 if (body.enabled !== undefined) await repo.setEnabled(Boolean(body.enabled));
 const partial = pickEditable(key, body);
 if (partial && Object.keys(partial).length > 0) await repo.updateSettings(partial);
 const service = services[key];
 if (service && typeof service.reload === 'function') service.reload();
 const result = { ok: true, key, enabled: repo.isEnabled(), settings: repo.getSettings() };
 eventBus.emit(EVENTS.SETTINGS_CHANGED, {
 key,
 target: key,
 moderator: 'dashboard',
 reason: `${MODULE_SCHEMAS[key].label} settings updated`,
 before,
 after: result,
 });
 res.json(result);
 });

 return router;
}
