// Thin client over the two backends (proxied by Vite dev server)
async function req(base, path, opts = {}) {
  const res = await fetch(base + path, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data.errors && data.errors.join('; ')) || data.error || `HTTP ${res.status}`);
  return data;
}

export const core = {
  catalog: () => req('/core', '/v2/catalog'),
  createProposal: (body) => req('/core', '/v2/proposals', { method: 'POST', body }),
  updateProposal: (id, body) => req('/core', `/v2/proposals/${id}`, { method: 'PUT', body }),
  submitProposal: (id) => req('/core', `/v2/proposals/${id}/submit`, { method: 'POST' }),
  proposalForm: (id) => req('/core', `/v2/proposals/${id}/form`),
  getProposal: (id) => req('/core', `/v2/proposals/${id}`),
  listProposals: (agentCode) => req('/core', `/v2/proposals?agent_code=${agentCode || ''}`),
  paymentLink: (id) => req('/core', `/v2/proposals/${id}/payment-link`, { method: 'POST' }),
  payment: (token) => req('/core', `/v2/payments/${token}`),
  confirmPayment: (token) => req('/core', `/v2/payments/${token}/confirm`, { method: 'POST' })
};

export const ai = {
  login: (username, password) => req('/ai', '/login', { method: 'POST', body: { username, password } }),
  analyze: (token, text) => req('/ai', '/analyze', { method: 'POST', body: { text }, headers: { Authorization: `Bearer ${token}` } })
};

export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
