// AI feasibility portal backend — port 4002
const express = require('express');
const cors = require('cors');
const { analyze, LAYERS } = require('./src/analyzer');
const gen = require('./src/generators');

const app = express();
app.use(cors());
app.use(express.json());

// Demo-grade auth (portfolio prototype; real deployment = SSO)
const USERS = { pm: 'elevate@123' };
const tokens = new Set();

app.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (USERS[username] && USERS[username] === password) {
    const token = 'tok_' + Math.random().toString(36).slice(2);
    tokens.add(token);
    return res.json({ token, user: username });
  }
  res.status(401).json({ error: 'invalid credentials' });
});

const auth = (req, res, next) => {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  if (!tokens.has(t)) return res.status(401).json({ error: 'login required' });
  next();
};

app.get('/health', (_req, res) => res.json({ service: 'ai-feasibility-service', status: 'up' }));

app.post('/analyze', auth, (req, res) => {
  const text = (req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'text required' });
  const r = analyze(text);
  if (!r.matched) return res.json(r);
  const storyList = gen.stories(r);
  res.json({
    ...r,
    layers: LAYERS,
    verdict_label: gen.VERDICT_LABEL[r.overall],
    pdn_markdown: gen.pdn(r),
    stories: storyList,
    test_suites: gen.testCases(r, storyList)
  });
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => console.log(`[ai-feasibility-service] listening on :${PORT}`));
