import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { SettingsRepository } from '../src/database/repositories/SettingsRepository.js';
import { RuleService } from '../src/services/RuleService.js';
import { AuditRepository } from '../src/database/repositories/AuditRepository.js';

function database(data, name) {
 return {
 [name]: { data },
 uuid: () => 'test-id',
 persist: async () => {},
 };
}

test('warning escalation is configurable and sorted', async () => {
 const repo = new SettingsRepository(database({ groupInviteLinks: {}, messagesSeen: 0 }, 'settings'));
 const policy = await repo.setWarningEscalation({
 enabled: true,
 levels: [
 { threshold: 3, severity: 'critical', action: 'tempban', durationMs: 60000 },
 { threshold: 1, severity: 'normal', action: 'warn' },
 ],
 });
 assert.deepEqual(policy.levels.map((level) => level.threshold), [1, 3]);
});

test('legacy rules receive compatible defaults', () => {
 const rules = { R1: { title: 'Legacy', description: 'Old format', punishment: 'Warn' } };
 const repo = { getRules: () => rules };
 const service = new RuleService({ repo, logger: { info() {} }, eventBus: new EventEmitter() });
 assert.deepEqual(service.getRule('r1'), {
 id: 'R1', title: 'Legacy', description: 'Old format', punishment: 'Warn',
 severity: 'medium', cooldown: 0, enabled: true,
 });
});

test('rule cooldown blocks immediate reuse', () => {
 const service = new RuleService({ repo: { getRules: () => ({}) }, logger: { info() {} }, eventBus: new EventEmitter() });
 const rule = { id: 'R9', enabled: true, cooldown: 60000 };
 service.consumeRule(rule, 'group', 'user');
 assert.throws(() => service.consumeRule(rule, 'group', 'user'), /cooldown/);
});

test('audit records are newest first', async () => {
 const db = database({ records: [] }, 'audit');
 const repo = new AuditRepository(db);
 await repo.add({ action: 'warn', user: 'a', timestamp: 1 });
 await repo.add({ action: 'ban', user: 'b', timestamp: 2 });
 assert.deepEqual(repo.all().map((item) => item.action), ['BAN', 'WARN']);
});
