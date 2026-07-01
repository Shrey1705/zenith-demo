// In-memory store with a deliberately DB-shaped interface.
// Swapping to MongoDB = reimplement these six functions (see schema.sql).
// Async to match redisStore's interface — callers always await, regardless
// of which backend store/index.js picked.
const proposals = new Map();
const paymentLinks = new Map();

let seq = 1000;
const newId = async (p) => `${p}${Date.now().toString(36).toUpperCase()}${(seq++).toString(36).toUpperCase()}`;

module.exports = {
  newId,
  saveProposal: async (p) => { proposals.set(p.proposal_id, p); return p; },
  getProposal: async (id) => proposals.get(id) || null,
  listProposals: async (filter = {}) =>
    [...proposals.values()].filter(p => !filter.agent_code || p.agent_code === filter.agent_code),
  saveLink: async (l) => { paymentLinks.set(l.token, l); return l; },
  getLink: async (token) => paymentLinks.get(token) || null
};
