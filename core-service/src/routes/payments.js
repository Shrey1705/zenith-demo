const router = require('express').Router();
const svc = require('../services/proposalService');
const store = require('../store');

// Payment page bootstrap (customer opens payment link)
router.get('/payments/:token', async (req, res) => {
  const link = await store.getLink(req.params.token);
  if (!link) return res.status(404).json({ errors: ['invalid payment link'] });
  const p = await store.getProposal(link.proposal_id);
  res.json({
    token: link.token, status: link.status, amount: link.amount,
    proposal_id: p.proposal_id,
    summary: { sum_insured: p.sum_insured, tenure_years: p.tenure_years, members: p.members.length, proposer: p.proposer?.name }
  });
});

// Simulated payment-gateway success callback
router.post('/payments/:token/confirm', async (req, res) => {
  const r = await svc.confirmPayment(req.params.token);
  r.errors ? res.status(400).json(r) : res.json(r);
});

module.exports = router;
