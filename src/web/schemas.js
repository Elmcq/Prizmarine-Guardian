/**
 * @file Dashboard module metadata. Declares which moderation modules are
 * exposed in the dashboard and which of their settings are editable via the UI
 * (beyond the on/off `enabled` flag, which is handled by each repo's
 * `setEnabled`). The keys here MUST match the repo keys in `repos`.
 */

/** Module keys that appear in the dashboard (must match `repos` keys). */
export const MODULE_KEYS = ['nsfw', 'advertisement', 'raid', 'sticker'];

/**
 * Per-module display + editable-field metadata.
 * `type` is used by the UI to render the right input (`int` | `bool`).
 */
export const MODULE_SCHEMAS = {
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

/**
 * Extract only the editable fields present in `partial` for a module.
 * @param {string} moduleKey
 * @param {object} partial
 * @returns {object|null} the subset to forward to `repo.updateSettings`, or
 *   null if the module is unknown.
 */
export function pickEditable(moduleKey, partial = {}) {
  const schema = MODULE_SCHEMAS[moduleKey];
  if (!schema) return null;
  const out = {};
  for (const f of schema.fields) {
    if (partial[f.key] !== undefined) out[f.key] = partial[f.key];
  }
  return out;
}
