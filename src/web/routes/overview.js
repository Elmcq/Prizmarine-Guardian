/**
 * @file GET /api/overview — aggregated dashboard snapshot.
 * Reuses the same repos/services the bot already uses (no new data sources).
 */
import express from 'express';
import { MODULE_KEYS } from '../schemas.js';

export function overviewRouter({ repos, services, config }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const health = services.health.getStats();
    const modules = {};
    for (const key of MODULE_KEYS) {
      const repo = repos[key];
      modules[key] = {
        enabled: repo.isEnabled(),
        settings: repo.getSettings(),
        stats: repo.getStats(),
      };
    }
    res.json({
      bot: {
        name: config.botName,
        owner: config.owner,
        uptimeHuman: health.uptimeHuman,
        uptimeMs: health.uptimeMs,
      },
      health: {
        memory: health.memory,
        messagesSeen: health.messagesSeen,
        totalWarnings: health.totalWarnings,
        activeBans: health.activeBans,
      },
      modules,
      rules: repos.rules.getStats(),
    });
  });

  return router;
}
