// Picks the persistent store when Upstash Redis env vars are present
// (Vercel Marketplace integration), otherwise falls back to the in-memory
// store — so `npm run dev` keeps working locally with zero setup.
const hasUpstash =
  (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
  (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN);

module.exports = hasUpstash ? require('./redisStore') : require('./memoryStore');
