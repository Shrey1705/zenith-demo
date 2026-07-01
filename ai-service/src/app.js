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
const USERS = { pm: 'elevate@123' };
const AUTH_SECRET = process.env.AI_AUTH_SECRET || 'elevate-demo-secret';

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

module.exports = app;
