import test from 'node:test';
import assert from 'node:assert/strict';
import { ContactResolver } from '../src/services/ContactResolver.js';

function settings(initial = {}) {
 const profiles = { ...initial };
 return {
 getContactProfiles: () => profiles,
 getContactProfile: (id) => profiles[id] || null,
 setContactProfile: async (id, profile) => { profiles[id] = profile; },
 profiles,
 };
}

test('resolves and persists WhatsApp contact names', async () => {
 const store = settings();
 const client = { getContactById: async () => ({ pushname: 'Azzam' }) };
 const resolver = new ContactResolver(client, null, store);
 assert.equal(await resolver.resolve('628123456789@c.us'), 'Azzam');
 assert.equal(store.profiles['628123456789@c.us'].name, 'Azzam');
});

test('resolves group names through chat API', async () => {
 const store = settings();
 const client = { getChatById: async () => ({ name: 'Prizmarine Staff' }) };
 const resolver = new ContactResolver(client, null, store);
 assert.equal(await resolver.resolve('120363000000@g.us'), 'Prizmarine Staff');
});

test('uses persisted cache across restarts', async () => {
 const store = settings({ '628123@c.us': { name: 'Cached User', type: 'contact', updatedAt: Date.now() } });
 const resolver = new ContactResolver(null, null, store);
 assert.equal(await resolver.resolve('628123@c.us'), 'Cached User');
});

test('formats phone fallback instead of exposing JID', async () => {
 const resolver = new ContactResolver({ getContactById: async () => { throw new Error('offline'); } }, null, settings());
 const result = await resolver.resolve('628123456789@c.us');
 assert.equal(result.includes('@'), false);
 assert.equal(result, '0812 3456 789');
});
