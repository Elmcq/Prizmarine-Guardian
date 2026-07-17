import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { StaffRepository } from '../src/database/repositories/StaffRepository.js';
import { StaffService } from '../src/services/StaffService.js';

function mockDb(records = []) {
 const data = { records: [...records] };
 return {
  data,
  read: async () => {},
  write: async () => {},
 };
}

function mockDbService(records = []) {
 const db = mockDb(records);
 return {
  staff: db,
  persist: async () => {},
  uuid: () => 'test-uuid',
 };
}

function mockLogger() {
 return { info: () => {}, warn: () => {}, error: () => {} };
}

describe('StaffRepository', () => {
 let repo;
 let dbService;

 beforeEach(() => {
  dbService = mockDbService();
  repo = new StaffRepository(dbService);
 });

 it('add creates a staff record', async () => {
  const record = await repo.add('628123456789', 'Azzam');
  assert.equal(record.phone, '628123456789');
  assert.equal(record.name, 'Azzam');
  assert.equal(record.role, 'support');
 });

 it('add returns null if phone already exists', async () => {
  await repo.add('628123456789', 'Azzam');
  const result = await repo.add('628123456789', 'Duplicate');
  assert.equal(result, null);
 });

 it('findByPhone returns correct record', async () => {
  await repo.add('628123456789', 'Azzam');
  await repo.add('628987654321', 'Budi');
  const found = repo.findByPhone('628123456789');
  assert.equal(found.name, 'Azzam');
 });

 it('findByPhone returns null for missing', async () => {
  assert.equal(repo.findByPhone('0000000000'), null);
 });

 it('isStaff returns true for registered phone', async () => {
  await repo.add('628123456789', 'Azzam');
  assert.equal(repo.isStaff('628123456789'), true);
 });

 it('isStaff returns false for unregistered phone', async () => {
  assert.equal(repo.isStaff('628123456789'), false);
 });

 it('remove deletes staff record', async () => {
  await repo.add('628123456789', 'Azzam');
  const removed = await repo.remove('628123456789');
  assert.equal(removed, true);
  assert.equal(repo.findByPhone('628123456789'), null);
 });

 it('remove returns false if not found', async () => {
  const removed = await repo.remove('0000000000');
  assert.equal(removed, false);
 });

 it('count returns total staff', async () => {
  await repo.add('628123456789', 'Azzam');
  await repo.add('628987654321', 'Budi');
  assert.equal(repo.count(), 2);
 });

 it('findAll returns all staff', async () => {
  await repo.add('628123456789', 'Azzam');
  await repo.add('628987654321', 'Budi');
  const all = repo.findAll();
  assert.equal(all.length, 2);
 });

 it('normalize strips non-numeric characters', async () => {
  await repo.add('+62 812-345-6789', 'Azzam');
  const found = repo.findByPhone('628123456789');
  assert.equal(found.name, 'Azzam');
 });
});

describe('StaffService', () => {
 let service;
 let repo;

 beforeEach(() => {
  const dbService = mockDbService();
  repo = new StaffRepository(dbService);
  service = new StaffService({ repo, logger: mockLogger() });
 });

 it('isStaff delegates to repo', async () => {
  assert.equal(service.isStaff('628123456789'), false);
  await repo.add('628123456789', 'Azzam');
  assert.equal(service.isStaff('628123456789'), true);
 });

 it('add creates staff record', async () => {
  const record = await service.add('628123456789', 'Azzam', 'owner@c.us');
  assert.equal(record.phone, '628123456789');
  assert.equal(record.addedBy, 'owner@c.us');
 });

 it('add returns null if already exists', async () => {
  await service.add('628123456789', 'Azzam');
  const result = await service.add('628123456789', 'Duplicate');
  assert.equal(result, null);
 });

 it('remove deletes staff', async () => {
  await service.add('628123456789', 'Azzam');
  const removed = await service.remove('628123456789');
  assert.equal(removed, true);
  assert.equal(service.isStaff('628123456789'), false);
 });

 it('formatStaffList produces readable text', async () => {
  await service.add('628123456789', 'Azzam');
  await service.add('628987654321', 'Budi');
  const text = service.formatStaffList(repo.findAll());
  assert.ok(text.includes('Azzam'));
  assert.ok(text.includes('Budi'));
  assert.ok(text.includes('Total: 2'));
 });

 it('formatStaffList returns message when empty', () => {
  const text = service.formatStaffList([]);
  assert.equal(text, '📋 No staff registered.');
 });

 it('formatStaffAdded produces readable text', async () => {
  const record = await service.add('628123456789', 'Azzam');
  const text = service.formatStaffAdded(record);
  assert.ok(text.includes('Azzam'));
  assert.ok(text.includes('628123456789'));
 });

 it('formatStaffRemoved produces readable text', () => {
  const text = service.formatStaffRemoved('628123456789');
  assert.ok(text.includes('628123456789'));
 });
});
