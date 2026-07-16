// AI feasibility portal backend — app assembly only.
// server.js (local dev) and api/ai/[...path].js (Vercel) both mount this.
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { analyze, LAYERS, readSource } = require('./analyzer');
const { ENTITIES } = require('./knowledge');
const gen = require('./generators');

const accounts = require('./accounts');

const app = express();
app.use(cors());
// Workspace sync payloads are whole documents and outgrow the API-wide cap.
const json100 = express.json({ limit: '100kb' });
const json1m = express.json({ limit: '1mb' });
app.use((req, res, next) => (req.path === '/ws' ? json1m : json100)(req, res, next));

// Public-demo rate limiting: reuses the same Upstash Redis env vars as
// core-service's store. No env vars ⇒ no Redis ⇒ skip limiting entirely.
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
let ratelimit = null;
if (redisUrl && redisToken) {
  const { Ratelimit } = require('@upstash/ratelimit');
  const { Redis } = require('@upstash/redis');
  ratelimit = new Ratelimit({
    redis: new Redis({ url: redisUrl, token: redisToken }),
    limiter: Ratelimit.slidingWindow(30, '60 s'),
    prefix: 'ratelimit:ai'
  });
}
app.use(async (req, res, next) => {
  if (!ratelimit) return next();
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const { success } = await ratelimit.limit(ip);
  if (!success) return res.status(429).json({ error: 'rate limit exceeded — try again shortly' });
  next();
});

// Demo-grade auth (portfolio prototype; real deployment = SSO).
// Stateless signed token instead of an in-memory Set: a serverless
// invocation that issues a token may not be the one that later verifies
// it, so there's nothing to look up server-side — just recompute the HMAC.
const USERS = { pm: 'zenith@123' };
const AUTH_SECRET = process.env.AI_AUTH_SECRET || 'zenith-demo-secret';

// Token payload is `subject|expiryMs` (expiry 0 = never, used by the demo
// account); magic-link sessions get 30 days. Legacy tokens without the
// expiry part still verify.
function signToken(subject, days = 0) {
  const payload = `${subject}|${days ? Date.now() + days * 86400e3 : 0}`;
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex').slice(0, 24);
  return `tok_${Buffer.from(payload).toString('base64url')}.${sig}`;
}
function verifyToken(token) {
  if (!String(token || '').startsWith('tok_')) return null;
  const [b64, sig] = String(token).slice(4).split('.');
  if (!b64 || !sig) return null;
  const payload = Buffer.from(b64, 'base64url').toString('utf8');
  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex').slice(0, 24);
  if (sig !== expected) return null;
  const [subject, exp] = payload.split('|');
  if (exp && Number(exp) > 0 && Date.now() > Number(exp)) return null;
  return subject;
}

app.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (USERS[username] && USERS[username] === password) {
    return res.json({ token: signToken(username), user: username });
  }
  res.status(401).json({ error: 'invalid credentials' });
});

const auth = (req, res, next) => {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  const subject = verifyToken(t);
  if (!subject) return res.status(401).json({ error: 'login required' });
  req.subject = subject;
  next();
};
// Workspace sync is for real (email) accounts only — the demo account's
// data deliberately stays in the browser.
const authUser = (req, res, next) => auth(req, res, () => {
  if (!req.subject.includes('@')) return res.status(403).json({ error: 'workspace sync requires an email account' });
  next();
});

// ---- magic-link accounts ----
app.post('/auth/request-link', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (email.length > 120 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'valid email required' });
  }
  const code = crypto.randomBytes(24).toString('base64url');
  await accounts.putMagic(code, email);
  // Origin survives the Vite dev proxy (host does not) and equals the site
  // origin on Vercel, where /api/ai is same-origin.
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const origin = req.headers.origin || `${proto}://${host}`;
  const link = `${origin}/ai/verify?code=${code}`;
  try {
    const { delivered } = await accounts.sendMagicEmail({ to: email, link });
    if (delivered) return res.json({ sent: true });
  } catch { /* provider hiccup — fall through to the no-delivery paths */ }
  if (process.env.VERCEL_ENV === 'production') {
    return res.status(503).json({ error: 'email delivery is not configured yet — use the demo login for now' });
  }
  // Local/preview without an email provider: hand the link back directly.
  res.json({ sent: false, devLink: link });
});

app.get('/auth/verify', async (req, res) => {
  const email = await accounts.takeMagic(String(req.query.code || ''));
  if (!email) return res.status(400).json({ error: 'link expired or already used — request a new one' });
  await accounts.ensureUser(email);
  res.json({ token: signToken(email, 30), email });
});

// ---- per-user workspace sync (whole-document, client is source of truth) ----
app.get('/ws', authUser, async (req, res) => {
  res.json({ data: await accounts.getWs(req.subject) });
});
app.put('/ws', authUser, async (req, res) => {
  const data = req.body?.data;
  if (!data || typeof data !== 'object') return res.status(400).json({ error: 'data object required' });
  const bytes = JSON.stringify(data).length;
  if (bytes > 900000) return res.status(413).json({ error: 'workspace too large to sync (900KB cap) — remove large uploads' });
  await accounts.putWs(req.subject, data);
  res.json({ ok: true, savedAt: new Date().toISOString(), bytes });
});

app.get('/health', (_req, res) => res.json({ service: 'ai-feasibility-service', status: 'up' }));

// The indexed source files, for client-side RAG: a locally-hosted model can
// embed and cite the ACTUAL code the deterministic analyzer grounds on.
app.get('/sources', auth, (_req, res) => {
  const files = [...new Set(Object.values(ENTITIES).flatMap((e) => e.impacts.map((i) => i.file)))];
  res.json({
    files: files
      .map((file) => ({ file, content: readSource(file) }))
      .filter((f) => f.content != null)
      .map((f) => ({ file: f.file, content: f.content.slice(0, 8000) }))
  });
});

app.post('/analyze', auth, (req, res) => {
  const text = (req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'text required' });
  if (text.length > 500) return res.status(400).json({ error: 'text too long (max 500 chars)' });
  const r = analyze(text);
  if (!r.matched) return res.json(r);
  const storyList = gen.stories(r);
  res.json({
    ...r,
    layers: LAYERS,
    verdict_label: gen.VERDICT_LABEL[r.overall],
    effort_points: gen.SIZE_POINTS[r.size],
    legend: gen.LEGEND_MD,
    pdn_markdown: gen.pdn(r),
    stories: storyList,
    test_suites: gen.testCases(r, storyList)
  });
});

// PM copilot chat. Deterministic offline brain by default; if a tenant
// supplies ANTHROPIC_API_KEY it upgrades to a live LLM transparently —
// same endpoint, same contract (the Feasly plug-and-play story).
const { chatReply } = require('./chat');
app.post('/chat', auth, async (req, res) => {
  const messages = (Array.isArray(req.body?.messages) ? req.body.messages : [])
    .slice(-10)
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 1000) }));
  const last = messages.length ? messages[messages.length - 1].content.trim() : '';
  if (!last) return res.status(400).json({ error: 'message required' });

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
          max_tokens: 700,
          system: 'You are the PM copilot inside Feasly, a feasibility workspace connected to a health-insurance codebase (Zenith: core policy system + purchase journey). Be concise and practical. For feasibility questions, remind the user that Feasibility Studio gives code-grounded verdicts with file-and-line evidence.',
          messages
        })
      });
      const data = await resp.json();
      const reply = data?.content?.[0]?.text;
      if (reply) return res.json({ reply, engine: 'llm' });
    } catch { /* fall through to the deterministic brain */ }
  }

  res.json({ reply: chatReply(last), engine: 'deterministic' });
});

module.exports = app;
