import express from 'express';
import { EVENTS } from '../../config/constants.js';

export function settingsRouter({ repos, config, eventBus }) {
 const router = express.Router();

 router.get('/warning-escalation', (req, res) => {
 res.json(repos.settings.getWarningEscalation(config.warnLimit, config.banDuration));
 });

 router.put('/warning-escalation', async (req, res) => {
 try {
 const policy = await repos.settings.setWarningEscalation(req.body || {});
 eventBus.emit(EVENTS.SETTINGS_CHANGED, {
 key: 'warningEscalation',
 target: 'moderation',
 moderator: 'dashboard',
 reason: 'Warning escalation policy updated',
 policy,
 });
 res.json(policy);
 } catch (err) {
 res.status(400).json({ error: err.message });
 }
 });

 return router;
}
