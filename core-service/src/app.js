// Core policy-admin system (mock of enterprise core) — app assembly only.
// server.js (local dev) and api/core/[...path].js (Vercel) both mount this.
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

// Public-demo rate limiting: reuses the Upstash Redis connection already
// required for the store (see src/store/redisStore.js). No env vars ⇒ no
// Redis ⇒ skip limiting entirely, matching the store's local-dev fallback.
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
let ratelimit = null;
if (redisUrl && redisToken) {
  const { Ratelimit } = require('@upstash/ratelimit');
  const { Redis } = require('@upstash/redis');
  ratelimit = new Ratelimit({
    redis: new Redis({ url: redisUrl, token: redisToken }),
    limiter: Ratelimit.slidingWindow(30, '60 s'),
    prefix: 'ratelimit:core'
  });
}
app.use(async (req, res, next) => {
  if (!ratelimit) return next();
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const { success } = await ratelimit.limit(ip);
  if (!success) return res.status(429).json({ error: 'rate limit exceeded — try again shortly' });
  next();
});

app.get('/health', (_req, res) => res.json({ service: 'core-policy-system', status: 'up' }));
app.use('/v2', require('./routes/proposals'));
app.use('/v2', require('./routes/payments'));

module.exports = app;
