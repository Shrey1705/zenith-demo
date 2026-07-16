// Accounts + per-user workspaces — same storage philosophy as core-service's
// store: Upstash Redis when the env vars are present (serverless-safe),
// automatic in-memory fallback for zero-setup local dev. Magic-link codes are
// one-time and expire in 15 minutes; user workspaces are whole-document JSON
// keyed by email.
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

let redis = null;
if (url && token) {
  const { Redis } = require('@upstash/redis');
  redis = new Redis({ url, token });
}

// In-memory fallback — fine for single-process local dev, useless across
// serverless invocations (which is exactly when the Redis env vars exist).
const mem = { magic: new Map(), users: new Map(), ws: new Map() };

const MAGIC_TTL_S = 15 * 60;

async function putMagic(code, email) {
  if (redis) return redis.set(`magic:${code}`, email, { ex: MAGIC_TTL_S });
  mem.magic.set(code, { email, exp: Date.now() + MAGIC_TTL_S * 1000 });
}

// One-time: reading a code consumes it.
async function takeMagic(code) {
  if (!code) return null;
  if (redis) {
    const email = await redis.get(`magic:${code}`);
    if (email) await redis.del(`magic:${code}`);
    return email || null;
  }
  const hit = mem.magic.get(code);
  mem.magic.delete(code);
  return hit && hit.exp > Date.now() ? hit.email : null;
}

async function ensureUser(email) {
  if (redis) {
    const existing = await redis.get(`user:${email}`);
    if (!existing) await redis.set(`user:${email}`, { email, createdAt: new Date().toISOString() });
    return;
  }
  if (!mem.users.has(email)) mem.users.set(email, { email, createdAt: new Date().toISOString() });
}

async function getWs(email) {
  if (redis) return (await redis.get(`ws:${email}`)) || null;
  return mem.ws.get(email) || null;
}

async function putWs(email, data) {
  if (redis) return redis.set(`ws:${email}`, data);
  mem.ws.set(email, data);
}

// Magic-link delivery via Resend. No RESEND_API_KEY ⇒ { delivered: false }
// and the caller decides (dev hands the link back; production refuses).
async function sendMagicEmail({ to, link }) {
  if (!process.env.RESEND_API_KEY) return { delivered: false };
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || 'Feasly <onboarding@resend.dev>',
      to: [to],
      subject: 'Your Feasly sign-in link',
      html: `<p>Click to sign in to your Feasly workspace:</p><p><a href="${link}">Sign in to Feasly</a></p><p>This link works once and expires in 15 minutes. If you didn't request it, ignore this email.</p>`
    })
  });
  if (!r.ok) throw new Error(`Resend returned ${r.status}`);
  return { delivered: true };
}

module.exports = { putMagic, takeMagic, ensureUser, getWs, putWs, sendMagicEmail };
