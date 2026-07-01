// In-memory store with a deliberately DB-shaped interface.
// Swapping to MongoDB = reimplement these six functions (see schema.sql).
const proposals = new Map();
const paymentLinks = new Map();

let seq = 1000;
const newId = (p) => `${p}${Date.now().toString(36).toUpperCase()}${(seq++).toString(36).toUpperCase()}`;

module.exports = {
  newId,
  saveProposal: (p) => { proposals.set(p.proposal_id, p); return p; },
  getProposal: (id) => proposals.get(id) || null,
  listProposals: (filter = {}) =>
    [...proposals.values()].filter(p => !filter.agent_code || p.agent_code === filter.agent_code),
  saveLink: (l) => { paymentLinks.set(l.token, l); return l; },
  getLink: (token) => paymentLinks.get(token) || null
};
