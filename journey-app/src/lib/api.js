// Thin client over the two backends (proxied by Vite dev server)
async function req(base, path, opts = {}) {
  const res = await fetch(base + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data.errors && data.errors.join('; ')) || data.error || `HTTP ${res.status}`);
  return data;
}

export const core = {
  catalog: () => req('/api/core', '/v2/catalog'),
  quotePlans: (body) => req('/api/core', '/v2/quotes/plans', { method: 'POST', body }),
  createProposal: (body) => req('/api/core', '/v2/proposals', { method: 'POST', body }),
  updateProposal: (id, body) => req('/api/core', `/v2/proposals/${id}`, { method: 'PUT', body }),
  submitProposal: (id) => req('/api/core', `/v2/proposals/${id}/submit`, { method: 'POST' }),
  proposalForm: (id) => req('/api/core', `/v2/proposals/${id}/form`),
  getProposal: (id) => req('/api/core', `/v2/proposals/${id}`),
  listProposals: (agentCode) => req('/api/core', `/v2/proposals?agent_code=${agentCode || ''}`),
  paymentLink: (id) => req('/api/core', `/v2/proposals/${id}/payment-link`, { method: 'POST' }),
  payment: (token) => req('/api/core', `/v2/payments/${token}`),
  confirmPayment: (token) => req('/api/core', `/v2/payments/${token}/confirm`, { method: 'POST' })
};

export const ai = {
  login: (username, password) => req('/api/ai', '/login', { method: 'POST', body: { username, password } }),
  requestLink: (email) => req('/api/ai', '/auth/request-link', { method: 'POST', body: { email } }),
  verify: (code) => req('/api/ai', `/auth/verify?code=${encodeURIComponent(code)}`),
  getWs: (token) => req('/api/ai', '/ws', { headers: { Authorization: `Bearer ${token}` } }),
  putWs: (token, data) => req('/api/ai', '/ws', { method: 'PUT', body: { data }, headers: { Authorization: `Bearer ${token}` } }),
  apiToken: (token) => req('/api/ai', '/auth/api-token', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
  drainInbox: (token) => req('/api/ai', '/inbox/drain', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
  analyze: (token, text) => req('/api/ai', '/analyze', { method: 'POST', body: { text }, headers: { Authorization: `Bearer ${token}` } }),
  chat: (token, messages) => req('/api/ai', '/chat', { method: 'POST', body: { messages }, headers: { Authorization: `Bearer ${token}` } }),
  sources: (token) => req('/api/ai', '/sources', { headers: { Authorization: `Bearer ${token}` } })
};

export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
