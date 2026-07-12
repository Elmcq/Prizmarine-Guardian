/**
 * @file Command registry. Imports every command module and exposes a
 * `Map<name, Command>` plus a `commandList` for help listing.
 *
 * @typedef {object} CommandContext
 * @property {object} message      - whatsapp-web.js Message.
 * @property {string[]} args       - Arguments after the command name.
 * @property {import('whatsapp-web.js').Client} client
 * @property {import('../config/env.js').config} config
 * @property {import('winston').Logger} logger
 * @property {import('../events/EventBus.js').EventBus} eventBus
 * @property {{
 *   warnings: import('../database/repositories/WarningRepository.js').WarningRepository,
 *   bans: import('../database/repositories/BanRepository.js').BanRepository,
 *   settings: import('../database/repositories/SettingsRepository.js').SettingsRepository,
 *   badwords: import('../database/repositories/BadwordRepository.js').BadwordRepository,
 *   rules: import('../database/repositories/RuleRepository.js').RuleRepository
 * }} repos
 * @property {{
 *   toxicity: import('../services/ToxicityService.js').ToxicityService,
 *   spam: import('../services/SpamService.js').SpamService,
 *   moderation: import('../services/ModerationService.js').ModerationService,
 *   health: import('../services/HealthService.js').HealthService,
 *   backup: import('../services/BackupService.js').BackupService,
 *   rule: import('../services/RuleService.js').RuleService,
 *   permission: import('../services/PermissionService.js').PermissionService
 * }} services
 * @property {import('../services/RateLimiter.js').RateLimiter} rateLimiter
 * @property {Map<string, object>} commandRegistry - self reference for !help.
 * @property {object|null} chat    - Chat (group) or null.
 * @property {string} authorId    - message.author || message.from.
 * @property {string|null} groupId - chat.id._serialized for groups, else null.
 * @property {boolean} isAdmin
 * @property {boolean} isOwner
 * @property {string} commandName
 */

import warn from './warn.js';
import clearwarn from './clearwarn.js';
import warnings from './warnings.js';
import ban from './ban.js';
import unban from './unban.js';
import settings from './settings.js';
import help from './help.js';
import stats from './stats.js';
import memory from './memory.js';
import uptime from './uptime.js';
import antinsfw from './antinsfw.js';
import reloadnsfw from './reloadnsfw.js';
import antiad from './antiad.js';
import reloadad from './reloadad.js';
import antiraid from './antiraid.js';
import raidmode from './raidmode.js';
import raidstatus from './raidstatus.js';
import reloadraid from './reloadraid.js';
import antisticker from './antisticker.js';
import stickerstatus from './stickerstatus.js';
import reloadsticker from './reloadsticker.js';
import rules from './rules.js';
import rule from './rule.js';
import addrule from './addrule.js';
import editrule from './editrule.js';
import deleterule from './deleterule.js';
import exportrules from './exportrules.js';
import kick from './kick.js';
import tempban from './tempban.js';

const modules = [
  warn,
  clearwarn,
  warnings,
  ban,
  unban,
  settings,
  help,
  stats,
  memory,
  uptime,
  antinsfw,
  reloadnsfw,
  antiad,
  reloadad,
  antiraid,
  raidmode,
  raidstatus,
  reloadraid,
  antisticker,
  stickerstatus,
  reloadsticker,
  rules,
  rule,
  addrule,
  editrule,
  deleterule,
  exportrules,
  kick,
  tempban,
];

/** @type {Map<string, object>} */
export const commandRegistry = new Map();
for (const mod of modules) {
  commandRegistry.set(mod.name.toLowerCase(), mod);
}

/** @type {object[]} */
export const commandList = modules;

export default commandRegistry;
