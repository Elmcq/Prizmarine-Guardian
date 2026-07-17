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
import antitoxic from './antitoxic.js';
import reloadtoxic from './reloadtoxic.js';
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
import ticket from './ticket.js';
import myticket from './myticket.js';
import tickets from './tickets.js';
import close from './close.js';

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
 antitoxic,
 reloadtoxic,
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
 ticket,
 myticket,
 tickets,
 close,
];

export const commandRegistry = new Map();
for (const command of modules) commandRegistry.set(command.name.toLowerCase(), command);
export const commandList = modules;
export default commandRegistry;
