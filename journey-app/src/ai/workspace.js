// Feasly workspace store — v3: a knowledge-first artifact chain.
//
//   Research → BRD (versioned) → PDN → Epic → Story → Functional Req → Test
//
// Everything lives per-project in localStorage. Traceability is computed
// from parent links, and staleness is computed — never stored: a PDN records
// the BRD version it was generated from, so when the BRD gains a version the
// entire downstream chain reports "upstream changed" with zero bookkeeping.
import { useSyncExternalStore } from 'react';

const KEY = 'feasly-workspace-v3';

// ---- shared store (all components see the same snapshot) ----
let cache = null;
const subs = new Set();
const read = () => {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw === null ? seedState() : JSON.parse(raw);
    if (raw === null) persist();
  } catch { cache = seedState(); }
  return cache;
};
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* ignore */ } };

export function useWS() {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, read);
}
export const getWS = read;
export function mutate(fn) {
  cache = fn(JSON.parse(JSON.stringify(read())));
  persist();
  subs.forEach((cb) => cb());
}
// Rehearsal helper: wipe the workspace back to the seeded demo state
// without a reload (login token survives).
export function resetWS() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  cache = null;
  read();
  subs.forEach((cb) => cb());
}

export const uid = () => Math.random().toString(36).slice(2, 9);
export const now = () => new Date().toISOString();
export const shortDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
// Derive a document title from a structured prompt: prefer the "Task:"
// clause, else the first sentence — so an engineered prompt doesn't become
// a wall-of-text title.
export function titleFrom(q) {
  const task = /task\s*:\s*([^.\n]+)/i.exec(q)?.[1];
  const t = (task || q.replace(/^\s*(context|role|task)\s*:\s*/i, '').split(/[.\n]/)[0]).trim();
  const clean = t.charAt(0).toUpperCase() + t.slice(1);
  return (clean.length > 64 ? clean.slice(0, 63) + '…' : clean) || q.slice(0, 48);
}

// ---- model routing ----
export const usingLocal = (ws) => ws.activeModelId === 'local' && !!ws.local?.chatModel;
export function activeModelLabel(ws) {
  if (usingLocal(ws)) return `${ws.local.chatModel} @ Ollama · temp ${ws.local.temperature ?? 0.1} · RAG`;
  const m = (ws.models || []).find((x) => x.id === ws.activeModelId);
  return m ? m.name : 'Feasly demo brain (offline)';
}

// ---- artifact type registry (chain order matters) ----
export const TYPES = {
  research: { key: 'research', label: 'Research', one: 'Research note', icon: '🔍', parent: null },
  brd: { key: 'brds', label: 'BRDs', one: 'BRD', icon: '📋', parent: null },
  pdn: { key: 'pdns', label: 'PDNs', one: 'PDN', icon: '📄', parent: 'brd', parentKey: 'brdId' },
  epic: { key: 'epics', label: 'Epics', one: 'Epic', icon: '🧱', parent: 'pdn', parentKey: 'pdnId' },
  story: { key: 'stories', label: 'User Stories', one: 'User Story', icon: '🗂', parent: 'epic', parentKey: 'epicId' },
  fr: { key: 'frs', label: 'Functional Requirements', one: 'Functional Requirement', icon: '📐', parent: 'story', parentKey: 'storyId' },
  test: { key: 'tests', label: 'Test Cases', one: 'Test Case', icon: '✅', parent: 'fr', parentKey: 'frId' }
};
export const CHAIN = ['research', 'brd', 'pdn', 'epic', 'story', 'fr', 'test'];
export const CHILD_OF = { brd: 'pdn', pdn: 'epic', epic: 'story', story: 'fr', fr: 'test' };
export const ROUTE_OF = { research: 'research', brd: 'brds', pdn: 'pdns', epic: 'epics', story: 'stories', fr: 'frs', test: 'tests' };

export const findProject = (ws, pid) => (ws.projects || []).find((p) => p.id === pid) || null;
export const findDoc = (project, type, id) => (project?.[TYPES[type].key] || []).find((d) => d.id === id) || null;

export function updateDoc(ws, pid, type, id, patch) {
  return {
    ...ws,
    projects: ws.projects.map((p) => p.id !== pid ? p : {
      ...p, [TYPES[type].key]: p[TYPES[type].key].map((d) => (d.id === id ? { ...d, ...patch } : d))
    })
  };
}
export function addDoc(ws, pid, type, doc) {
  return {
    ...ws,
    projects: ws.projects.map((p) => p.id !== pid ? p : { ...p, [TYPES[type].key]: [...p[TYPES[type].key], doc] })
  };
}
export function removeDoc(ws, pid, type, id) {
  return {
    ...ws,
    projects: ws.projects.map((p) => p.id !== pid ? p : { ...p, [TYPES[type].key]: p[TYPES[type].key].filter((d) => d.id !== id) })
  };
}

// ---- traceability ----
export function parentOf(project, type, doc) {
  const t = TYPES[type];
  if (!t.parent) return null;
  const parent = findDoc(project, t.parent, doc[t.parentKey]);
  return parent ? { type: t.parent, doc: parent } : null;
}
export function childrenOf(project, type, doc) {
  // Research fans out to whatever references it (BRDs and PDNs).
  if (type === 'research') {
    return [
      ...(project.brds || []).filter((b) => (b.researchIds || []).includes(doc.id)).map((d) => ({ type: 'brd', doc: d })),
      ...(project.pdns || []).filter((p) => (p.researchIds || []).includes(doc.id)).map((d) => ({ type: 'pdn', doc: d }))
    ];
  }
  const childType = CHILD_OF[type];
  if (!childType) return [];
  const ct = TYPES[childType];
  return (project[ct.key] || []).filter((d) => d[ct.parentKey] === doc.id).map((d) => ({ type: childType, doc: d }));
}
// Ordered chain from research/BRD down to this doc.
export function upstreamOf(project, type, doc) {
  const chain = [];
  let cur = { type, doc };
  while (cur) {
    const p = parentOf(project, cur.type, cur.doc);
    if (p) chain.unshift(p);
    cur = p;
  }
  // BRDs additionally trace back to their linked research.
  const top = chain[0] || { type, doc };
  if (top.type === 'brd') {
    const research = (top.doc.researchIds || [])
      .map((rid) => findDoc(project, 'research', rid))
      .filter(Boolean)
      .map((d) => ({ type: 'research', doc: d }));
    return [...research, ...chain];
  }
  return chain;
}
// Flat downstream list (breadth-first, deduped — research can reach a PDN
// both directly and through its BRD).
export function downstreamOf(project, type, doc) {
  const out = [];
  const seen = new Set();
  let frontier = childrenOf(project, type, doc);
  while (frontier.length) {
    const fresh = frontier.filter((n) => !seen.has(n.type + n.doc.id));
    fresh.forEach((n) => seen.add(n.type + n.doc.id));
    out.push(...fresh);
    frontier = fresh.flatMap((n) => childrenOf(project, n.type, n.doc));
  }
  return out;
}

// ---- computed staleness ----
// A PDN is stale when its source BRD has moved past the version it was
// generated from; everything under a stale PDN inherits it.
export function staleInfo(project, type, doc) {
  if (type === 'research' || type === 'brd') return null;
  let pdn = doc;
  if (type !== 'pdn') {
    const chain = upstreamOf(project, type, doc);
    const hit = chain.find((n) => n.type === 'pdn');
    if (!hit) return null;
    pdn = hit.doc;
  }
  const brd = findDoc(project, 'brd', pdn.brdId);
  if (!brd) return null;
  const cur = brd.versions.length;
  if (pdn.brdVersion < cur) {
    return { brd, from: pdn.brdVersion, current: cur, pdn };
  }
  return null;
}

// ---- generation: derive the delivery chain from an ai.analyze result ----
export function pdnFromAnalysis(brd, r) {
  const version = brd.versions.length;
  const content =
    (r.pdn_markdown || `# PDN — ${brd.title}`) +
    `\n\n---\n_Generated from BRD "${brd.title}" v${version} · ${r.verified}/${r.impacts.length} impacts verified against source code._`;
  return {
    id: uid(), title: `PDN — ${brd.title}`, brdId: brd.id, brdVersion: version,
    researchIds: [...(brd.researchIds || [])],
    content, analysis: r, createdAt: now()
  };
}
export function deriveEpics(pdn) {
  const r = pdn.analysis;
  if (!r) return [];
  const byLayer = {};
  for (const im of r.impacts) {
    const sys = r.layers[im.layer]?.system || im.layer;
    (byLayer[sys] = byLayer[sys] || []).push(im);
  }
  return Object.entries(byLayer).map(([system, impacts]) => ({
    id: uid(), pdnId: pdn.id, title: `${system} — ${r.title || r.text.slice(0, 44)}`,
    summary: impacts.map((i) => i.change).join('. ') + '.',
    system, createdAt: now()
  }));
}
export function deriveStories(pdn, epics) {
  const r = pdn.analysis;
  if (!r) return [];
  return (r.stories || []).map((s) => {
    // Generated stories carry the owning system in `component`; match the
    // epic on it exactly, falling back to the first (core) epic for
    // cross-system stories like QA regression.
    const epic = epics.find((e) => e.system === s.component) || epics[0];
    return {
      id: uid(), epicId: epic?.id, title: s.summary,
      description: s.description, ac: [...(s.ac || [])], points: s.points, component: s.component, createdAt: now()
    };
  });
}
export function deriveFrs(stories) {
  return stories.flatMap((s) => (s.ac || []).map((ac, i) => ({
    id: uid(), storyId: s.id,
    title: `FR — ${ac.length > 70 ? ac.slice(0, 70) + '…' : ac}`,
    description: `The system shall satisfy: ${ac}`,
    createdAt: now()
  })));
}
export function deriveTests(pdn, stories, frs) {
  const r = pdn.analysis;
  if (!r) return [];
  const out = [];
  for (const suite of r.test_suites || []) {
    const story = stories.find((s) => suite.story.includes(s.title.slice(0, 24))) || stories[0];
    const storyFrs = frs.filter((f) => f.storyId === story?.id);
    suite.cases.forEach((c, i) => {
      const fr = storyFrs[i % Math.max(1, storyFrs.length)] || frs[0];
      if (!fr) return;
      out.push({ id: uid(), frId: fr.id, title: c.title, gherkin: c.gherkin, createdAt: now() });
    });
  }
  return out;
}

// ---- inline AI helpers (deterministic, instant) ----
export function brdCompletenessReview(brd) {
  const s = brd.sections;
  const findings = [];
  if (!s.background.trim()) findings.push('Background is empty — reviewers can\'t judge intent without the business problem.');
  if (s.requirements.length < 3) findings.push(`Only ${s.requirements.length} requirement(s) — most approved BRDs here carry 3+. Consider edge flows (failure, retry, reversal).`);
  if (!s.stakeholders.trim()) findings.push('No stakeholders named — sign-off will stall without owners.');
  if (!s.success.trim()) findings.push('Success criteria missing — add a measurable target so the PDN can carry it into test coverage.');
  if (!(brd.researchIds || []).length) findings.push('No research linked — link the notes that motivated this so traceability starts at the source.');
  if (!findings.length) findings.push('Structurally complete: background, 3+ requirements, stakeholders, success criteria and linked research are all present.');
  return findings;
}
export function generateAc(story) {
  const t = story.title.replace(/\.$/, '');
  return [
    `Given the change "${t}", the primary flow completes without regression to existing behaviour`,
    'Invalid or missing input is rejected with a clear inline message',
    'The outcome is visible on the review screen and persisted to the proposal record'
  ];
}
export function edgeCasesFor(fr) {
  const base = fr.title.replace(/^FR — /, '').replace(/…$/, '');
  return [
    { title: `Edge — ${base.slice(0, 40)} under concurrent update`, gherkin: `Given two sessions edit the same proposal\nWhen both submit within the same second\nThen the second write is rejected with a version conflict\nAnd no partial state is persisted` },
    { title: `Edge — ${base.slice(0, 40)} with boundary input`, gherkin: `Given the input is at its exact boundary value\nWhen the requirement is exercised\nThen the system accepts the boundary and rejects one unit beyond it` }
  ];
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// =====================  SEED DATA  =====================
// EMI is deliberately NOT seeded — it is the live interview walkthrough,
// built from a blank project on stage (research → conversations → BRD v1 →
// PDN → chain → v2 → staleness → regenerate). What ships pre-seeded is one
// mature showcase project (₹2 Cr sum-insured expansion, full clean chain)
// as the fallback/reference, plus a light KYC draft so Home feels lived-in.
function seedState() {
  const R1 = 'r-hni', R2 = 'r-uwband';
  const B1 = 'b-si';
  const P1 = 'p-si';
  const E1 = 'e-si-core', E2 = 'e-si-journey';
  const S1 = 's-si-band', S2 = 's-si-contract', S3 = 's-si-format';
  const F1 = 'f-si-band', F2 = 'f-si-rates', F3 = 'f-si-compat', F4 = 'f-si-format';
  const siSections = {
    background: 'HNI prospects abandon at quote because our sum-insured selector tops out at \u20b91 crore while their existing group covers already exceed it. Distribution reports losing high-premium quotes weekly to competitors with \u20b92 crore retail bands.',
    requirements: [
      'Add a \u20b92 crore sum insured band to the retail catalogue',
      'Define underwriting limits and the medical-test grid for the new band',
      'Verify no consumer hardcodes the current maximum sum insured'
    ],
    stakeholders: 'Underwriting, Actuarial, Reinsurance, D2C Journey PM',
    success: '\u22655% of new policies pick the \u20b92 crore band within two quarters; zero mispriced issuances.'
  };
  const siAnalysis = {
    matched: true, text: siSections.requirements.join('. '),
    title: 'Sum-insured bands',
    overall: 'r', verdict_label: 'Red \u2014 core system change required', effort_points: 8, size: 'M',
    sprints: '1\u20132 sprints after actuarial rates', verified: 4,
    layers: { frontend: { label: 'Journey frontend', system: 'journey-app' }, api: { label: 'API contract', system: 'core-service' }, core: { label: 'Core business rules', system: 'core-service' }, db: { label: 'Core data model', system: 'core-service' } },
    impacts: [
      { layer: 'core', v: 'r', file: 'core-service/src/rules/underwriting.rules.yaml', change: 'Extend sum_insured_bands; medical-test grid & UW limits for the new band', evidence: { line: 30, snippet: 'sum_insured_bands: [500000, 1000000, ...]' } },
      { layer: 'core', v: 'r', file: 'core-service/src/rules/premium.rules.yaml', change: 'sum_insured_multiplier has no rate for the new band \u2014 actuarial input required', evidence: { line: 18, snippet: 'sum_insured_multiplier:' } },
      { layer: 'api', v: 'g', file: 'core-service/src/api/contracts/proposal-v2.contract.json', change: 'Contract references the band list by enum_ref \u2014 additive, verify no hardcoded caps', evidence: { line: 12, snippet: '"enum_ref": "sum_insured_bands"' } },
      { layer: 'frontend', v: 'g', file: 'journey-app/src/journey/steps.jsx', change: 'SI selector renders from core catalog API \u2014 verify \u20b9-crore formatting', evidence: null }
    ],
    pdn_markdown: '# PDN \u2014 Add a \u20b92 crore sum-insured band\n\n## Impacted systems\n- Core rules: sum_insured_bands + sum_insured_multiplier (actuarial rate needed)\n- API contract: additive \u2014 band list is enum-referenced\n- Journey: selector renders from catalog; verify crore formatting\n\n## Sequencing\n1. Actuarial rate for the band\n2. Core rules + UW medical grid\n3. Journey verification\n\n## Sign-offs\n- [x] Underwriting\n- [x] Actuarial\n- [x] Reinsurance',
    stories: [], test_suites: []
  };

  return {
    models: [],           // BYO cloud-key connections (Settings \u2192 Model Hub)
    activeModelId: null,  // null = demo brain \u00b7 'local' = Ollama via ws.local
    local: { endpoint: 'http://localhost:11434', chatModel: '', embedModel: '', temperature: 0.1 },
    projects: [
      {
        id: 'proj-si', name: 'High-Value Cover Expansion',
        about: 'Open a \u20b92 crore sum-insured band for HNI customers without breaking underwriting limits.',
        createdAt: now(),
        research: [
          { id: R1, title: 'HNI demand \u2014 lost-quote analysis', source: 'upload', sourceDetail: 'lost-quotes-q1.pdf', createdAt: now(), content: 'Quarterly review of abandoned high-premium quotes.\n\n38 quotes above \u20b91.5L annual premium abandoned at the sum-insured step this quarter; 31 of those users tried to select a higher band before dropping. Distribution confirms competitors quote \u20b92 crore retail bands to the same profiles.' },
          { id: R2, title: 'Underwriting & rating constraints for a new SI band', source: 'ai', createdAt: now(), content: 'Saved from a Feasly conversation.\n\nThe band list lives in underwriting.rules.yaml (sum_insured_bands) and every band needs a matching rate in premium.rules.yaml (sum_insured_multiplier) \u2014 a new band without an actuarial rate fails rating. The proposal-v2 contract references the band list by enum_ref, so the API change is additive. High-SI bands typically trigger pre-policy medicals \u2014 a hidden journey branch to scope with UW.' }
        ],
        conversations: [
          {
            id: 'c-si', title: 'Can we add a \u20b92 crore sum insured band?', updatedAt: now(),
            messages: [
              { role: 'assistant', content: "Hi! I'm Feasly, connected to the Zenith Health tenant \u2014 code, contracts and docs. Ask me anything.", engine: 'deterministic' },
              { role: 'user', content: 'Can we add a \u20b92 crore sum insured band?' },
              { role: 'assistant', content: 'Feasible but core-gated: sum_insured_bands in underwriting.rules.yaml and a matching sum_insured_multiplier rate are both required \u2014 the rate needs actuarial input. The API side is additive (band list is enum-referenced). I\u2019ve saved the full constraint breakdown to Research.', engine: 'deterministic', savedAsResearchId: R2 }
            ]
          }
        ],
        brds: [
          {
            id: B1, title: 'Add a \u20b92 crore sum-insured band', owner: 'PM', status: 'Approved',
            researchIds: [R1, R2], sections: siSections, createdAt: now(),
            versions: [{ v: 1, ts: now(), note: 'Initial draft from lost-quote research', sections: siSections }]
          }
        ],
        pdns: [{ id: P1, title: 'PDN \u2014 Add a \u20b92 crore sum-insured band', brdId: B1, brdVersion: 1, researchIds: [R1, R2], content: siAnalysis.pdn_markdown + '\n\n---\n_Generated from BRD "Add a \u20b92 crore sum-insured band" v1 \u00b7 4/4 impacts verified against source code._', analysis: siAnalysis, createdAt: now() }],
        epics: [
          { id: E1, pdnId: P1, title: 'core-service \u2014 Sum-insured bands', system: 'core-service', summary: 'Extend sum_insured_bands with UW limits and the medical-test grid; add the actuarial rate to sum_insured_multiplier.', createdAt: now() },
          { id: E2, pdnId: P1, title: 'journey-app \u2014 Sum-insured bands', system: 'journey-app', summary: 'Verify the SI selector renders the new band from the catalog and formats crore amounts correctly.', createdAt: now() }
        ],
        stories: [
          { id: S1, epicId: E1, title: 'Extend sum-insured bands with UW grid and actuarial rate', component: 'core-service', points: 8, description: 'Add the \u20b92 crore band to underwriting rules with its medical-test grid, and the actuarial multiplier to the rating rules.', ac: ['Given the new band is selected, rating uses the certified actuarial multiplier', 'Existing band premiums are unchanged against the regression baseline'], createdAt: now() },
          { id: S2, epicId: E1, title: 'Verify contract consumers tolerate the extended band list', component: 'core-service', points: 3, description: 'The band list is enum-referenced in proposal-v2; confirm no consumer hardcodes the current maximum.', ac: ['Existing v2 consumers pass contract tests with the extended list'], createdAt: now() },
          { id: S3, epicId: E2, title: 'Journey SI selector renders and formats the new band', component: 'journey-app', points: 3, description: 'The selector reads bands from the catalog API; verify \u20b92 Cr renders correctly across quote, review and PDF.', ac: ['The \u20b92 crore chip renders from the catalog without a frontend release', 'Crore formatting is correct on quote, review and the proposal PDF'], createdAt: now() }
        ],
        frs: [
          { id: F1, storyId: S1, title: 'FR \u2014 New band rates from the certified multiplier', description: 'The system shall rate the \u20b92 crore band using the certified actuarial multiplier.', createdAt: now() },
          { id: F2, storyId: S1, title: 'FR \u2014 Existing band premiums unchanged', description: 'The system shall produce unchanged premiums for all existing bands after the rules change.', createdAt: now() },
          { id: F3, storyId: S2, title: 'FR \u2014 Band list remains additive for v2 consumers', description: 'The system shall accept proposal-v2 payloads from consumers unaware of the new band.', createdAt: now() },
          { id: F4, storyId: S3, title: 'FR \u2014 Crore formatting across quote, review, PDF', description: 'The system shall format the \u20b92 crore band consistently on the quote selector, review screen and proposal PDF.', createdAt: now() }
        ],
        tests: [
          { id: 't-si-01', frId: F1, title: 'New band premium matches actuarial table', gherkin: 'Given a proposal on the \u20b92 crore band\nWhen the premium is rated\nThen it matches the certified actuarial table for the band', createdAt: now() },
          { id: 't-si-02', frId: F2, title: 'Existing bands regression-clean', gherkin: 'Given the pre-change regression baseline\nWhen the full rating pack re-runs\nThen all existing band premiums are unchanged', createdAt: now() },
          { id: 't-si-03', frId: F3, title: 'Old consumers unaffected by the new band', gherkin: 'Given a consumer on contract v2.0 without the new band\nWhen it submits a proposal\nThen the request succeeds unchanged', createdAt: now() },
          { id: 't-si-04', frId: F4, title: 'Crore formatting is correct end-to-end', gherkin: 'Given a customer selects the \u20b92 crore band\nWhen quote, review and PDF render\nThen the amount is formatted as \u20b92 Cr consistently', createdAt: now() }
        ],
        releases: [{ id: 'rel-si', name: 'R-2026.07 \u2014 \u20b92 Cr band', date: '2026-07-30', storyIds: [S1, S2, S3], createdAt: now() }]
      },
      {
        id: 'proj-kyc', name: 'Nominee & KYC Enhancements',
        about: 'Compliance-driven improvements to nominee capture and proposer identity checks.',
        createdAt: now(),
        research: [{ id: 'r-kyc', title: 'KYC circular — PAN capture thresholds', source: 'note', createdAt: now(), content: 'Regulator guidance requires PAN capture above a premium threshold. Current journey already collects PAN as mandatory; verify threshold logic is documented before drafting requirements.' }],
        conversations: [],
        brds: [{
          id: 'b-kyc', title: 'Threshold-based PAN verification', owner: 'PM', status: 'Draft', researchIds: ['r-kyc'], createdAt: now(),
          sections: { background: 'PAN is captured for all proposers today, but verification (against the issuer) only matters above the regulatory premium threshold.', requirements: ['Verify PAN with the issuer when annual premium exceeds the threshold'], stakeholders: 'Compliance', success: '' },
          versions: [{ v: 1, ts: now(), note: 'Initial draft', sections: { background: 'PAN is captured for all proposers today, but verification (against the issuer) only matters above the regulatory premium threshold.', requirements: ['Verify PAN with the issuer when annual premium exceeds the threshold'], stakeholders: 'Compliance', success: '' } }]
        }],
        pdns: [], epics: [], stories: [], frs: [], tests: [], releases: []
      }
    ]
  };
}
