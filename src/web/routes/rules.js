import express from 'express';

export function rulesRouter({ services }) {
 const router = express.Router();
 const service = services.rule;

 router.get('/', (req, res) => {
 res.json(service.listRules({ includeDisabled: true }));
 });

 router.post('/', async (req, res) => {
 try {
 const created = await service.addRule(req.body || {}, 'dashboard');
 res.status(201).json(created);
 } catch (err) {
 res.status(400).json({ error: err.message });
 }
 });

 router.put('/:id', async (req, res) => {
 try {
 const body = req.body || {};
 const updated = body.field
 ? await service.editRule(req.params.id, body.field, body.value, 'dashboard')
 : await service.updateRule(req.params.id, body, 'dashboard');
 res.json(updated);
 } catch (err) {
 res.status(400).json({ error: err.message });
 }
 });

 router.delete('/:id', async (req, res) => {
 try {
 res.json(await service.deleteRule(req.params.id, 'dashboard'));
 } catch (err) {
 res.status(400).json({ error: err.message });
 }
 });

 return router;
}
