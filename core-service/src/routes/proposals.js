const router = require('express').Router();
const svc = require('../services/proposalService');
const store = require('../store');
const { RULES, UW } = require('../services/premiumService');

// Catalog for frontend bootstrapping (SI bands, addons, questions come from core rules)
router.get('/catalog', (_req, res) => res.json({
  sum_insured_bands: UW.sum_insured_bands,
  tenure_options_years: RULES.tenure_options_years,
  tenure_discount_pct: RULES.tenure_discount_pct,
  addons: Object.entries(RULES.addons).map(([code, a]) => ({ code, label: a.label, pct: a.pct, flat: a.flat })),
  medical_questions: UW.medical_questions,
  permitted_relationships: UW.permitted_relationships
}));

router.post('/proposals', async (req, res) => {
  const r = await svc.createProposal(req.body);
  r.errors ? res.status(400).json(r) : res.status(201).json(r.proposal);
});
router.put('/proposals/:id', async (req, res) => {
  const r = await svc.updateProposal(req.params.id, req.body);
  r.errors ? res.status(400).json(r) : res.json(r.proposal);
});
router.post('/proposals/:id/submit', async (req, res) => {
  const r = await svc.submitProposal(req.params.id);
  r.errors ? res.status(400).json(r) : res.json(r.proposal);
});
router.get('/proposals/:id/form', async (req, res) => {
  const f = await svc.proposalForm(req.params.id);
  f ? res.json(f) : res.status(404).json({ errors: ['not found'] });
});
router.get('/proposals/:id', async (req, res) => {
  const p = await store.getProposal(req.params.id);
  p ? res.json(p) : res.status(404).json({ errors: ['not found'] });
});
router.get('/proposals', async (req, res) => res.json(await store.listProposals({ agent_code: req.query.agent_code })));
router.post('/proposals/:id/payment-link', async (req, res) => {
  const r = await svc.createPaymentLink(req.params.id);
  r.errors ? res.status(400).json(r) : res.json(r);
});

module.exports = router;
