// Demo automation — the "Do it for me" engine behind the guided coach.
//
// Every action here drives the REAL workspace store through the exact same
// functions the pages use (addDoc, pdnFromAnalysis, deriveEpics/Stories/…,
// ai.analyze, ai.chat) — so an auto-run produces byte-identical state to a
// human clicking through. Actions are idempotent: re-running one (or the
// whole sequence) never duplicates a project, BRD, PDN or chain.
import { ai } from '../lib/api';
import { detectOllama } from '../lib/ollama';
import {
  getWS, mutate, resetWS, uid, now, titleFrom, addDoc, updateDoc,
  pdnFromAnalysis, deriveEpics, deriveStories, deriveFrs, deriveTests,
  staleInfo
} from './workspace';

const PROJECT_NAME = 'EMI & Payment Flexibility';
const BRD_TITLE = 'Offer monthly premium payment (EMI)';

export const PROMPT_1 = `Task: assess whether Zenith can offer monthly EMI premium payments today.
Scope: rating rules, payment lifecycle, proposal API contract.
Constraints: cite file-and-line evidence for every claim; if something cannot be verified in code, flag it — do not guess.
Output: current constraint, impacted systems, severity.`;

export const PROMPT_2 = `Context: our payment gateway retries a failed instalment webhook for 72 hours and has no native default handling; mandates are capped at ₹15,000 per instalment.
Task: recommend a default-handling rule for missed EMI instalments on a health policy that bounds underwriting risk without cancelling cover.
Output: one BRD-ready requirement sentence plus a 3-line rationale.`;

const REQUIREMENTS = [
  'Offer a monthly EMI payment option alongside annual at quote and checkout',
  'Compute an interest-free instalment schedule from the annual premium',
  'Reflect the selected payment plan on the review screen and proposal PDF'
];
const REQUIREMENT_4 = 'Define default handling: two consecutive missed instalments pause the policy pending payment';
const STAKEHOLDERS = 'Underwriting, Payments, D2C Journey PM';
const BACKGROUND = 'Customers on annual-only plans cite cash-flow strain as the top reason for dropping at quote. Competitors already offer monthly EMI; today Zenith only supports ANNUAL payment.';
const SUCCESS = 'EMI adoption ≥20% of new policies in the first quarter; no rise in the payment-default rate.';

const GATEWAY_DOC = 'Imported from API documentation.\n\nThe gateway supports tokenised recurring mandates (UPI Autopay + card standing instructions) with a webhook per instalment.\n\nRelevant limits: mandate ceiling ₹15,000/instalment without re-auth; webhook retries for 72 hours, then gives up; refunds must reference the original instalment id.\n\nNo built-in default handling — if an instalment fails, the product decides what happens next.';

// ---- lookups (name-based, so actions stay stateless across navigations) ----
const project = () => (getWS().projects || []).find((p) => p.name === PROJECT_NAME) || null;
const emiBrd = (p) => (p?.brds || []).find((b) => b.title === BRD_TITLE) || null;
const emiPdn = (p, brdId) => (p?.pdns || []).find((d) => d.brdId === brdId) || (p?.pdns || [])[0] || null;
const hasResearchTitled = (p, title) => (p?.research || []).some((r) => r.title === title);

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- individual actions. Each: async ({ token, nav }) => void ----

async function resetAndStart() {
  resetWS();
  await pause(150);
}

async function createProject({ nav }) {
  let p = project();
  if (!p) {
    p = {
      id: uid(), name: PROJECT_NAME,
      about: 'Give customers a monthly EMI option instead of annual-only premiums.',
      createdAt: now(), folders: [],
      research: [], conversations: [], brds: [], pdns: [], epics: [], stories: [], frs: [], tests: [], releases: []
    };
    mutate((w) => ({ ...w, projects: [p, ...w.projects] }));
  }
  nav?.(`/ai/p/${p.id}/research`);
}

async function askResearch1({ token, nav }) {
  const p = project(); if (!p) return;
  nav?.(`/ai/p/${p.id}/research`);
  const title = titleFrom(PROMPT_1);
  if (hasResearchTitled(p, title)) return;
  // Force the deterministic engine for a fast, reliable auto-run regardless
  // of the active model — this mirrors saving an Ask-AI answer to Research.
  const r = await ai.chat(token, [{ role: 'user', content: PROMPT_1 }]);
  const doc = { id: uid(), title, source: 'ai', createdAt: now(), content: `Saved from an Ask-AI session.\n\nQ: ${PROMPT_1}\n\n${r.reply}` };
  mutate((w) => addDoc(w, p.id, 'research', doc));
}

async function importGateway({ nav }) {
  const p = project(); if (!p) return;
  nav?.(`/ai/p/${p.id}/research`);
  const title = 'Payment gateway capabilities — recurring mandates';
  if (hasResearchTitled(p, title)) return;
  const doc = { id: uid(), title, source: 'api', sourceDetail: 'Imported from gateway API docs', createdAt: now(), content: GATEWAY_DOC };
  mutate((w) => addDoc(w, p.id, 'research', doc));
}

async function fillBrd({ nav }) {
  const p = project(); if (!p) return;
  let brd = emiBrd(p);
  if (!brd) {
    brd = { id: uid(), title: BRD_TITLE, owner: 'PM', status: 'Draft', researchIds: [], sections: { background: '', requirements: [], stakeholders: '', success: '' }, createdAt: now(), versions: [] };
    mutate((w) => addDoc(w, p.id, 'brd', brd));
  }
  nav?.(`/ai/p/${p.id}/brds/${brd.id}`);
  // Fill background, the three requirements, stakeholders and link all
  // research — but deliberately leave success criteria empty so the
  // completeness review has something real to catch on the next step.
  const researchIds = (project().research || []).map((r) => r.id);
  mutate((w) => updateDoc(w, p.id, 'brd', brd.id, {
    researchIds,
    sections: { background: BACKGROUND, requirements: [...REQUIREMENTS], stakeholders: STAKEHOLDERS, success: '' }
  }));
}

async function completeAndSaveV1({ nav }) {
  const p = project(); if (!p) return;
  const brd = emiBrd(p); if (!brd) return;
  nav?.(`/ai/p/${p.id}/brds/${brd.id}`);
  if (brd.versions.length >= 1) return;
  const sections = { ...brd.sections, success: SUCCESS };
  mutate((w) => updateDoc(w, p.id, 'brd', brd.id, {
    sections,
    status: 'In review',
    versions: [{ v: 1, ts: now(), note: 'Initial draft from EMI research', sections }]
  }));
}

async function generatePdn({ token, nav }) {
  const p = project(); if (!p) return;
  let brd = emiBrd(p); if (!brd) return;
  if (emiPdn(p, brd.id)) { nav?.(`/ai/p/${p.id}/pdns/${emiPdn(p, brd.id).id}`); return; }
  const r = await ai.analyze(token, brd.sections.requirements.join('. ') || brd.title);
  if (!r.matched) throw new Error(r.note || 'Could not ground this BRD in the connected code.');
  if (brd.versions.length === 0) {
    brd = { ...brd, versions: [{ v: 1, ts: now(), note: 'Auto-saved when generating the PDN', sections: brd.sections }] };
    mutate((w) => updateDoc(w, p.id, 'brd', brd.id, { versions: brd.versions }));
  }
  const pdn = pdnFromAnalysis(brd, r);
  mutate((w) => addDoc(w, p.id, 'pdn', pdn));
  await pause(300);
  nav?.(`/ai/p/${p.id}/pdns/${pdn.id}`);
}

async function generateChain({ nav }) {
  const p = project(); if (!p) return;
  const brd = emiBrd(p); if (!brd) return;
  const pdn = emiPdn(p, brd.id); if (!pdn) return;
  nav?.(`/ai/p/${p.id}/pdns/${pdn.id}`);
  if (p.epics.some((e) => e.pdnId === pdn.id)) return;   // already generated
  const epics = deriveEpics(pdn);
  const stories = deriveStories(pdn, epics);
  const frs = deriveFrs(stories);
  const tests = deriveTests(pdn, stories, frs);
  mutate((w) => {
    let next = w;
    epics.forEach((e) => { next = addDoc(next, p.id, 'epic', e); });
    stories.forEach((s) => { next = addDoc(next, p.id, 'story', s); });
    frs.forEach((f) => { next = addDoc(next, p.id, 'fr', f); });
    tests.forEach((x) => { next = addDoc(next, p.id, 'test', x); });
    return next;
  });
}

async function askConversation2({ token, nav }) {
  const p = project(); if (!p) return;
  const existing = (p.conversations || []).find((c) => c.title === titleFrom(PROMPT_2));
  if (existing) { nav?.(`/ai/p/${p.id}/conversations/${existing.id}`); return; }
  const r = await ai.chat(token, [{ role: 'user', content: PROMPT_2 }]);
  const convId = uid();
  const researchDoc = { id: uid(), title: titleFrom(PROMPT_2), source: 'ai', createdAt: now(), content: `Saved from a Feasly conversation.\n\n${r.reply}` };
  mutate((w) => ({
    ...w,
    projects: w.projects.map((pr) => pr.id !== p.id ? pr : {
      ...pr,
      research: [researchDoc, ...pr.research],
      conversations: [{
        id: convId, title: titleFrom(PROMPT_2), updatedAt: now(),
        messages: [
          { role: 'user', content: PROMPT_2 },
          { role: 'assistant', content: r.reply, engine: r.engine, savedAsResearchId: researchDoc.id }
        ]
      }, ...pr.conversations]
    })
  }));
  nav?.(`/ai/p/${p.id}/conversations/${convId}`);
}

async function addReq4SaveV2({ nav }) {
  const p = project(); if (!p) return;
  const brd = emiBrd(p); if (!brd) return;
  nav?.(`/ai/p/${p.id}/brds/${brd.id}`);
  if (brd.sections.requirements.includes(REQUIREMENT_4)) return;
  const sections = { ...brd.sections, requirements: [...brd.sections.requirements, REQUIREMENT_4] };
  mutate((w) => updateDoc(w, p.id, 'brd', brd.id, {
    sections, status: 'Approved',
    versions: [...brd.versions, { v: brd.versions.length + 1, ts: now(), note: 'Added default handling after underwriting review', sections }]
  }));
}

async function regeneratePdn({ token, nav }) {
  const p = project(); if (!p) return;
  const brd = emiBrd(p); if (!brd) return;
  const pdn = emiPdn(p, brd.id); if (!pdn) return;
  nav?.(`/ai/p/${p.id}/pdns/${pdn.id}`);
  const stale = staleInfo(p, 'pdn', pdn);
  if (!stale) return;   // already regenerated / not stale
  const r2 = await ai.analyze(token, brd.sections.requirements.join('. ') || brd.title);
  if (!r2.matched) throw new Error(r2.note || 'Could not ground the updated BRD in the connected code.');
  mutate((w) => {
    let next = w;
    const proj = w.projects.find((x) => x.id === p.id);
    const existingTitles = new Set(proj.stories.map((s) => s.title));
    const pdnEpics = proj.epics.filter((e) => e.pdnId === pdn.id);
    const newStories = [];
    for (const s of (r2.stories || [])) {
      if (existingTitles.has(s.summary)) continue;
      let epic = pdnEpics.find((e) => e.system === s.component);
      if (!epic) {
        epic = { id: uid(), pdnId: pdn.id, title: `${s.component} — ${r2.title || 'additional scope'}`, system: s.component, summary: s.description, createdAt: now() };
        next = addDoc(next, p.id, 'epic', epic);
        pdnEpics.push(epic);
      }
      const story = { id: uid(), epicId: epic.id, title: s.summary, description: s.description, ac: [...(s.ac || [])], points: s.points, component: s.component, createdAt: now() };
      next = addDoc(next, p.id, 'story', story);
      newStories.push(story);
    }
    const newFrs = deriveFrs(newStories);
    for (const f of newFrs) next = addDoc(next, p.id, 'fr', f);
    const suites = (r2.test_suites || []).filter((su) => newStories.some((s) => su.story === s.title));
    for (const t of deriveTests({ analysis: { test_suites: suites } }, newStories, newFrs)) next = addDoc(next, p.id, 'test', t);
    return updateDoc(next, p.id, 'pdn', pdn.id, {
      brdVersion: stale.current, analysis: r2, researchIds: [...(brd.researchIds || [])],
      content: (r2.pdn_markdown || pdn.content) + `\n\n---\n_Regenerated from BRD "${brd.title}" v${stale.current} · ${r2.verified}/${r2.impacts.length} impacts verified against source code._`
    });
  });
}

// ---- navigation-only helpers ----
const goto = (route) => async ({ nav }) => { const p = project(); if (p) nav?.(`/ai/p/${p.id}/${route}`); };

async function detectAndActivateLocal({ nav }) {
  const ws = getWS();
  nav?.('/ai/settings');
  const models = await detectOllama(ws.local?.endpoint || 'http://localhost:11434');
  if (!models || !models.length) throw new Error('No local Ollama models detected. Start Ollama and pull llama3.2 + nomic-embed-text, then try again.');
  const chat = models.filter((m) => !/embed/i.test(m.name));
  const embed = models.filter((m) => /embed/i.test(m.name));
  if (!chat.length || !embed.length) throw new Error('Need both a chat model (llama3.2) and an embedding model (nomic-embed-text).');
  mutate((w) => ({
    ...w, activeModelId: 'local',
    local: { ...(w.local || {}), endpoint: w.local?.endpoint || 'http://localhost:11434', chatModel: chat[0].name, embedModel: embed[0].name, temperature: w.local?.temperature ?? 0.1 }
  }));
}

// Registry keyed by the `auto` string on each coach step.
export const ACTIONS = {
  reset: resetAndStart,
  createProject,
  askResearch1,
  importGateway,
  fillBrd,
  completeAndSaveV1,
  generatePdn,
  generateChain,
  gotoTest: goto('tests'),
  gotoGraph: goto('graph'),
  gotoResearch: goto('research'),
  askConversation2,
  addReq4SaveV2,
  regeneratePdn,
  detectLocal: detectAndActivateLocal,
  gotoMap: goto('map'),
  gotoLibrary: goto('library'),
  gotoSettings: async ({ nav }) => nav?.('/ai/settings')
};

