// AI feasibility portal backend — app assembly only.
// server.js (local dev) and api/ai/[...path].js (Vercel) both mount this.
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { analyze, LAYERS } = require('./analyzer');
const gen = require('./generators');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

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

function signToken(username) {
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(username).digest('hex').slice(0, 24);
  return `tok_${Buffer.from(username).toString('base64url')}.${sig}`;
}
function verifyToken(token) {
  if (!String(token || '').startsWith('tok_')) return null;
  const [b64, sig] = String(token).slice(4).split('.');
  if (!b64 || !sig) return null;
  const username = Buffer.from(b64, 'base64url').toString('utf8');
  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(username).digest('hex').slice(0, 24);
  return sig === expected ? username : null;
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
  if (!verifyToken(t)) return res.status(401).json({ error: 'login required' });
  next();
};

app.get('/health', (_req, res) => res.json({ service: 'ai-feasibility-service', status: 'up' }));

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
