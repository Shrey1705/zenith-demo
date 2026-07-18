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
const mem = { magic: new Map(), users: new Map(), ws: new Map(), inbox: new Map() };

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
    if (!existing) await redis.set(`user:${email}`, { email, createdAt: new Date().toISOString(), plan: 'free' });
    return;
  }
  if (!mem.users.has(email)) mem.users.set(email, { email, createdAt: new Date().toISOString(), plan: 'free' });
}

async function getUser(email) {
  if (redis) return (await redis.get(`user:${email}`)) || null;
  return mem.users.get(email) || null;
}

// Freemium: the plan lives on the server user record so a client can't
// self-upgrade by editing localStorage. Founding-stage upgrades are done by
// the founder via the admin route after a Stripe payment lands.
async function setPlan(email, plan) {
  await ensureUser(email);
  if (redis) {
    const u = (await redis.get(`user:${email}`)) || { email, createdAt: new Date().toISOString() };
    await redis.set(`user:${email}`, { ...u, plan });
    return;
  }
  mem.users.set(email, { ...(mem.users.get(email) || { email }), plan });
}

async function getWs(email) {
  if (redis) return (await redis.get(`ws:${email}`)) || null;
  return mem.ws.get(email) || null;
}

async function putWs(email, data) {
  if (redis) return redis.set(`ws:${email}`, data);
  mem.ws.set(email, data);
}

// ---- integration inbox ----
// n8n (or any webhook source) queues items here; the signed-in client drains
// the queue and merges items into the workspace as research notes. The server
// never mutates the workspace document itself, so sync stays conflict-free.
const INBOX_MAX = 200;

async function pushInbox(email, item) {
  if (redis) {
    await redis.lpush(`inbox:${email}`, item);
    await redis.ltrim(`inbox:${email}`, 0, INBOX_MAX - 1);
    return;
  }
  const list = mem.inbox.get(email) || [];
  list.unshift(item);
  mem.inbox.set(email, list.slice(0, INBOX_MAX));
}

async function drainInbox(email) {
  if (redis) {
    const items = (await redis.lrange(`inbox:${email}`, 0, -1)) || [];
    if (items.length) await redis.del(`inbox:${email}`);
    return items;
  }
  const items = mem.inbox.get(email) || [];
  mem.inbox.delete(email);
  return items;
}

// ---- journey analytics (the demo tenant's Amplitude) ----
// The public buy journey fires anonymous step/click events here; the
// workspace reads them back as a funnel. A capped Redis list acts as a
// rolling window — enough for real drop-off analysis, bounded on cost.
const EVENTS_KEY = 'events:journey';
const EVENTS_MAX = 4000;

async function pushEvent(evt) {
  if (redis) {
    await redis.lpush(EVENTS_KEY, evt);
    await redis.ltrim(EVENTS_KEY, 0, EVENTS_MAX - 1);
    return;
  }
  const list = mem.events || (mem.events = []);
  list.unshift(evt);
  if (list.length > EVENTS_MAX) list.length = EVENTS_MAX;
}

async function readEvents() {
  if (redis) return (await redis.lrange(EVENTS_KEY, 0, EVENTS_MAX - 1)) || [];
  return mem.events || [];
}

// ---- booking insights ----
// core-service persists proposals in the same Redis (proposal:{id} +
// proposals:index) — reading them here turns real booking behaviour into
// research evidence for decisions. No Redis (bare local dev) ⇒ empty.
async function listProposals() {
  if (!redis) return [];
  const ids = (await redis.smembers('proposals:index')) || [];
  if (!ids.length) return [];
  const rows = await redis.mget(...ids.map((id) => `proposal:${id}`));
  return rows.filter(Boolean);
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

module.exports = { putMagic, takeMagic, ensureUser, getUser, setPlan, getWs, putWs, pushInbox, drainInbox, pushEvent, readEvents, listProposals, sendMagicEmail };
