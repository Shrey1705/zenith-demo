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
  const u = await accounts.getUser(email);
  res.json({ token: signToken(email, 30), email, plan: u?.plan || 'free' });
});

// Who does this token belong to? Used by invite links (?token=), which
// carry a ready session token instead of a one-time code. Also the client's
// source of truth for the account's plan.
app.get('/auth/whoami', auth, async (req, res) => {
  if (req.subject.includes('@')) {
    await accounts.ensureUser(req.subject);
    const u = await accounts.getUser(req.subject);
    return res.json({ subject: req.subject, plan: u?.plan || 'free' });
  }
  res.json({ subject: req.subject, plan: 'pro' }); // demo account sees everything
});

// Founder-only plan changes (after a Stripe payment lands): guarded by an
// admin key that lives only in server env + the founder's .env. No key
// configured ⇒ route disabled entirely.
app.post('/auth/set-plan', async (req, res) => {
  const key = process.env.ADMIN_KEY;
  if (!key || req.headers['x-admin-key'] !== key) return res.status(403).json({ error: 'forbidden' });
  const email = String(req.body?.email || '').toLowerCase();
  const plan = String(req.body?.plan || '');
  if (!email.includes('@') || !['free', 'pro'].includes(plan)) return res.status(400).json({ error: 'email and plan (free|pro) required' });
  await accounts.setPlan(email, plan);
  res.json({ ok: true, email, plan });
});

// Long-lived token for n8n/webhook use — same HMAC scheme as sessions,
// stateless (rotation = change AI_AUTH_SECRET).
app.post('/auth/api-token', authUser, (req, res) => {
  res.json({ token: signToken(req.subject, 365), expiresInDays: 365 });
});

// ---- integration inbox: anything → your workspace ----
// n8n (or curl) queues items; the signed-in client drains them into the
// workspace as research notes. Server never touches the workspace doc.
app.post('/inbox', authUser, async (req, res) => {
  const title = String(req.body?.title || '').trim().slice(0, 200);
  const content = String(req.body?.content || '').trim();
  const source = String(req.body?.source || 'n8n').trim().slice(0, 60);
  if (!title || !content) return res.status(400).json({ error: 'title and content required' });
  if (content.length > 32000) return res.status(413).json({ error: 'content too large (32KB cap)' });
  await accounts.pushInbox(req.subject, { title, content, source, receivedAt: new Date().toISOString() });
  res.json({ ok: true, queued: title });
});

app.post('/inbox/drain', authUser, async (req, res) => {
  res.json({ items: await accounts.drainInbox(req.subject) });
});

// ---- journey analytics: the demo tenant's Amplitude ----
// Ingestion is public (journey visitors are anonymous) but strictly shaped,
// capped, and behind the global rate limiter. Reading requires an account.
app.post('/analytics/event', async (req, res) => {
  const { type, name, sid } = req.body || {};
  if (!['step', 'click'].includes(type) || !name || !sid) return res.status(400).json({ error: 'invalid event' });
  await accounts.pushEvent({ type, name: String(name).slice(0, 80), sid: String(sid).slice(0, 16), ts: Date.now() });
  res.json({ ok: true });
});

const FUNNEL_ORDER = ['Get a quote', 'Your details', 'Review & pay', 'Payment', 'Policy issued'];
app.get('/analytics/funnel', auth, async (_req, res) => {
  const events = await accounts.readEvents();
  const stepSids = Object.fromEntries(FUNNEL_ORDER.map((s) => [s, new Set()]));
  const allSids = new Set();
  const clicks = new Map();
  let oldest = Date.now();
  for (const e of events) {
    if (!e || !e.sid) continue;
    allSids.add(e.sid);
    if (e.ts && e.ts < oldest) oldest = e.ts;
    if (e.type === 'step' && stepSids[e.name]) stepSids[e.name].add(e.sid);
    if (e.type === 'click') clicks.set(e.name, (clicks.get(e.name) || 0) + 1);
  }
  const steps = FUNNEL_ORDER.map((name, i) => {
    const sessions = stepSids[name].size;
    const prev = i === 0 ? sessions : stepSids[FUNNEL_ORDER[i - 1]].size;
    return { name, sessions, dropFromPrev: i === 0 ? 0 : Math.max(0, prev - sessions) };
  });
  const first = steps[0]?.sessions || 0;
  const last = steps[steps.length - 1]?.sessions || 0;
  res.json({
    steps,
    totalSessions: allSids.size,
    conversionPct: first ? Math.round((last / first) * 100) : 0,
    topClicks: [...clicks.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, count]) => ({ name, count })),
    sampleSize: events.length,
    since: new Date(oldest).toISOString()
  });
});

// ---- booking insights: real policy data → research evidence ----
// Aggregates the proposals core-service persisted and turns them into the
// kind of insight bullets a PM would otherwise assemble by hand — ready to
// save as evidence on a decision.
app.get('/insights/bookings', auth, async (_req, res) => {
  const props = await accounts.listProposals();
  if (!props.length) {
    return res.json({ sampleSize: 0, insights: ['No bookings recorded yet — run the Buy journey end-to-end (or connect Redis locally) and real proposal data will aggregate here.'], byStatus: {}, planMix: [], siBands: [], topAddons: [] });
  }
  const byStatus = {};
  const plans = new Map(); const bands = new Map(); const addons = new Map();
  let premiumSum = 0, premiumN = 0;
  for (const p of props) {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    if (p.plan_id) plans.set(p.plan_id, (plans.get(p.plan_id) || 0) + 1);
    if (p.sum_insured) bands.set(p.sum_insured, (bands.get(p.sum_insured) || 0) + 1);
    for (const a of p.addons || []) addons.set(a, (addons.get(a) || 0) + 1);
    const pm = p.premium?.total ?? p.premium?.final_premium ?? (typeof p.premium === 'number' ? p.premium : null);
    if (pm) { premiumSum += pm; premiumN++; }
  }
  const sorted = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]);
  const total = props.length;
  const issued = byStatus.ISSUED || 0;
  const submitted = (byStatus.SUBMITTED || 0) + issued;
  const topBand = sorted(bands)[0];
  const topPlan = sorted(plans)[0];
  const insights = [
    `${total} proposal(s) in the window: ${issued} issued (${Math.round((issued / total) * 100)}% end-to-end conversion). The biggest leak is ${total - submitted > issued ? 'before submission — buyers draft but don\'t commit' : 'between submission and payment'}.`,
    topBand ? `Most-chosen sum insured: ₹${Number(topBand[0]).toLocaleString('en-IN')} (${topBand[1]}/${total}) — demand concentrates ${Number(topBand[0]) >= 10000000 ? 'at the top band: direct evidence for the high-SI decision' : 'in the mid bands'}.` : null,
    topPlan ? `Top plan: ${topPlan[0]} at ${Math.round((topPlan[1] / total) * 100)}% of proposals.` : null,
    sorted(addons).length ? `Top add-ons: ${sorted(addons).slice(0, 3).map(([a, n]) => `${a} (${n})`).join(', ')} — candidates for default-on bundling.` : 'No optional add-ons attached yet — the add-on step may be getting skipped.',
    premiumN ? `Average premium across priced proposals: ₹${Math.round(premiumSum / premiumN).toLocaleString('en-IN')}.` : null
  ].filter(Boolean);
  res.json({
    sampleSize: total, byStatus,
    planMix: sorted(plans).map(([name, count]) => ({ name, count })),
    siBands: sorted(bands).map(([band, count]) => ({ band: Number(band), count })),
    topAddons: sorted(addons).slice(0, 8).map(([name, count]) => ({ name, count })),
    insights
  });
});

// ---- scheduled playbooks: finished documents over the API ----
// n8n cron → this endpoint → post the markdown anywhere. Builds from the
// user's synced workspace (ws:{email}) with the deterministic engine.
const { stakeholderUpdate, decisionsDue } = require('./playbookServer');

// The Payback Law endpoint: n8n cron → this → WhatsApp/Gmail "you decided X
// in July at 60% confidence — revisit?". Returns decisions past their review
// date with no outcome yet, across all the user's projects.
app.get('/playbooks/decision-review', authUser, async (req, res) => {
  const ws = await accounts.getWs(req.subject);
  const windowDays = Math.max(0, Math.min(90, parseInt(req.query.window, 10) || 0));
  const due = decisionsDue(ws, windowDays);
  res.json({ count: due.length, decisions: due });
});

app.get('/playbooks/stakeholder-update', authUser, async (req, res) => {
  const ws = await accounts.getWs(req.subject);
  const projects = ws?.projects || [];
  if (!projects.length) return res.status(404).json({ error: 'no synced projects — sign in to the app and create one first' });
  const pick = req.query.project;
  const project = pick && pick !== 'first' ? projects.find((p) => p.id === pick || p.name === pick) : projects[0];
  if (!project) return res.status(404).json({ error: `project "${pick}" not found` });
  const r = stakeholderUpdate(project);
  res.json({ ...r, project: { id: project.id, name: project.name } });
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
