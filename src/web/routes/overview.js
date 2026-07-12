import express from 'express';
import { MODULE_KEYS } from '../schemas.js';

export function overviewRouter({ repos, services, config, contactResolver }) {
 const router = express.Router();

 router.get('/', async (req, res) => {
 const health = services.health.getStats();
 const modules = {};
 for (const key of MODULE_KEYS) {
 const repo = repos[key];
 modules[key] = { enabled: repo.isEnabled(), settings: repo.getSettings(), stats: repo.getStats() };
 }
 const activeModules = Object.values(modules).filter((module) => module.enabled).length;
 let recentActions = repos.audit.all(8);
 if (contactResolver) {
 const fields = ['user', 'moderator', 'groupId'];
 const ids = recentActions.flatMap((item) => fields.map((field) => item[field]).filter(Boolean));
 const names = await contactResolver.resolveMany(ids);
 recentActions = recentActions.map((item) => {
 const enriched = { ...item };
 for (const field of fields) {
 if (!item[field]) continue;
 enriched[`${field}Raw`] = item[field];
 enriched[field] = names.get(item[field]) || contactResolver.formatFallback(item[field]);
 }
 return enriched;
 });
 }

 res.json({
 bot: { name: config.botName, owner: config.owner, status: health.status, uptimeHuman: health.uptimeHuman, uptimeMs: health.uptimeMs },
 health: {
 memory: health.memory,
 messagesSeen: health.messagesSeen,
 blockedMessages: health.blockedMessages,
 totalWarnings: health.totalWarnings,
 activeBans: health.activeBans,
 activeModules,
 totalModules: MODULE_KEYS.length,
 },
 modules,
 rules: repos.rules.getStats(),
 recentActions,
 });
 });

 return router;
}
