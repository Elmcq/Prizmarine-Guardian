export const MODULE_KEYS = ['toxicity', 'nsfw', 'advertisement', 'raid', 'sticker'];

export const MODULE_SCHEMAS = {
toxicity: {
 label: 'Anti Toxic',
 fields: [
  { key: 'warnLimit', type: 'int', min: 1, label: 'Warn limit' },
  { key: 'highSeverityBan', type: 'bool', label: 'Ban on high severity' },
  { key: 'toxicThreshold', type: 'int', min: 1, label: 'Toxic score threshold' },
  { key: 'cooldownDurationMs', type: 'int', min: 1000, label: 'Warning cooldown (ms)' },
  { key: 'negationWindow', type: 'int', min: 1, label: 'Negation window (words)' },
  { key: 'targetRequired', type: 'bool', label: 'Require target for warning' },
 ],
},
 nsfw: {
 label: 'Anti NSFW',
 fields: [
 { key: 'warnLimit', type: 'int', min: 1, label: 'Warn limit' },
 { key: 'highSeverityBan', type: 'bool', label: 'Ban on high severity' },
 ],
 },
 advertisement: {
 label: 'Anti Advertisement',
 fields: [
 { key: 'warnLimit', type: 'int', min: 1, label: 'Warn limit' },
 { key: 'highSeverityBan', type: 'bool', label: 'Ban on high severity' },
 ],
 },
 raid: {
 label: 'Anti Raid',
 fields: [
 { key: 'autoRaidMode', type: 'bool', label: 'Auto Raid Mode' },
 { key: 'notifyAdmins', type: 'bool', label: 'Notify admins' },
 { key: 'raidModeDurationMs', type: 'int', min: 1000, label: 'Raid Mode duration (ms)' },
 ],
 },
 sticker: {
 label: 'Anti Sticker Spam',
 fields: [
 { key: 'maxStickers', type: 'int', min: 1, label: 'Max stickers / window' },
 { key: 'timeWindow', type: 'int', min: 1, label: 'Time window (s)' },
 { key: 'duplicateLimit', type: 'int', min: 1, label: 'Duplicate limit' },
 { key: 'warnLimit', type: 'int', min: 1, label: 'Warn limit' },
 ],
 },
};

export function pickEditable(moduleKey, partial = {}) {
 const schema = MODULE_SCHEMAS[moduleKey];
 if (!schema) return null;
 const out = {};
 for (const field of schema.fields) {
 if (partial[field.key] !== undefined) out[field.key] = partial[field.key];
 }
 return out;
}
