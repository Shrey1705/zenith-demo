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

export const uid = () => Math.random().toString(36).slice(2, 9);
export const now = () => new Date().toISOString();
export const shortDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

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
    id: uid(), pdnId: pdn.id, title: `${system} — ${pdn.analysis.text.slice(0, 44)}`,
    summary: impacts.map((i) => i.change).join('. ') + '.',
    system, createdAt: now()
  }));
}
export function deriveStories(pdn, epics) {
  const r = pdn.analysis;
  if (!r) return [];
  return (r.stories || []).map((s, i) => {
    const epic = epics.find((e) => s.summary.toLowerCase().includes((e.system || '').split(' ')[0].toLowerCase()))
      || epics[i % Math.max(1, epics.length)];
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
// EMI & Payment Flexibility is the flagship walkthrough: research about EMI
// feasibility, two conversations that motivate the BRD's requirements (the
// second directly produces the v2 default-handling requirement), a BRD that
// evolves v1 -> v2, and a PDN generated from the CURRENT version — so every
// epic, story, functional requirement and test case below traces cleanly to
// a specific BRD requirement, with nothing left stale or unaccounted for.
function seedState() {
  const R1 = 'r-churn', R2 = 'r-engine', R3 = 'r-gateway';
  const B1 = 'b-emi', B2 = 'b-quarterly';
  const P1 = 'p-emi';
  const E1 = 'e-core', E2 = 'e-journey', E3 = 'e-default';
  const S1 = 's-rating', S2 = 's-contract', S3 = 's-selector', S4 = 's-default';
  const F1 = 'f-instalment', F2 = 'f-annual', F3 = 'f-compat', F4 = 'f-selector', F5 = 'f-pdf';
  const F6 = 'f-pause', F7 = 'f-block-claims', F8 = 'f-resume';
  const brdSections = {
    background: 'Customers on annual-only plans cite cash-flow strain as the #1 reason for not converting at quote stage. Competitors offer monthly EMI; we currently only support ANNUAL. v2 adds the default-handling rule underwriting asked for after a payments-feasibility conversation.',
    requirements: [
      'Offer a monthly EMI option alongside annual at quote and checkout',
      'Compute an interest-free instalment schedule from the annual premium',
      'Reflect the payment plan on the review screen and proposal PDF',
      'Define default handling: two consecutive missed instalments pause the policy pending payment'
    ],
    stakeholders: 'Underwriting, Payments team, D2C Journey PM',
    success: 'EMI adoption ≥20% of new policies within one quarter of launch; no increase in payment-default rate.'
  };
  const analysis = {
    matched: true, text: 'Offer monthly premium payment (EMI) instead of annual only',
    overall: 'r', verdict_label: 'Red — core system change required', effort_points: 16, size: 'XL',
    sprints: '3–4 sprints; actuarial + finance dependency, start filings first', verified: 4,
    layers: { core: { system: 'Core policy system' }, api: { system: 'API contract (v2)' }, journey: { system: 'Journey app' } },
    impacts: [
      { layer: 'core', v: 'r', change: 'Add MONTHLY to payment_frequency_options', evidence: { line: 6, snippet: 'payment_frequency_options: [ANNUAL]' } },
      { layer: 'core', v: 'r', change: 'Add EMI schedule + interest-free instalment calc', evidence: { line: 43, snippet: 'function calculate(p) {' } },
      { layer: 'core', v: 'r', change: 'Add default handling: pause the policy after two consecutive missed instalments', evidence: { line: 65, snippet: "p.status = 'SUBMITTED';" } },
      { layer: 'api', v: 'a', change: 'Add payment_plan field — version bump, coordinate consumers', evidence: { line: 9, snippet: '"payment_frequency": "ANNUAL",' } },
      { layer: 'journey', v: 'g', change: 'Add payment-plan selector to review step', evidence: null },
      { layer: 'journey', v: 'g', change: 'Show instalment schedule on payment link page', evidence: null }
    ],
    pdn_markdown: '# PDN — Offer monthly premium payment (EMI)\n\n## Impacted systems\n- Core policy system (rating engine, DB)\n- API contract v2 (versioned field)\n- Journey app (UI only)\n\n## Business rules\nAnnual premium divided into 12 interest-free instalments; no change to underwriting outcome.\n\n## Default handling\nTwo consecutive missed instalments transition the policy to PAUSED; new claims are blocked until payment resumes, at which point the policy reactivates automatically.\n\n## Sequencing\n1. Core: rating rule + schedule calc\n2. Core: default-handling state machine (pause / resume)\n3. Contract: version bump, notify consumers\n4. Journey: selector UI, review + PDF\n\n## Sign-offs\n- [ ] Underwriting\n- [ ] Payments\n- [ ] Compliance',
    stories: [
      { summary: 'Add MONTHLY payment frequency to rating engine', component: 'premium.rules.yaml', points: 5, verdict: 'r', description: 'Extend payment_frequency_options and compute the instalment schedule.', tasks: ['Extend rules enum', 'Schedule calculator', 'Regression on ANNUAL'], ac: ['Given an ANNUAL premium, monthly instalment = annual/12 with no interest', 'Existing ANNUAL flow is unaffected'] },
      { summary: 'Version proposal-v2 contract for payment_plan', component: 'proposal-v2.contract.json', points: 3, verdict: 'a', description: 'Add the payment_plan field behind a version bump.', tasks: ['Add optional field', 'Changelog + consumer notice'], ac: ['New field is optional and backward compatible', 'Consumers are notified via changelog'] },
      { summary: 'Payment-plan selector in journey review step', component: 'steps.jsx', points: 5, verdict: 'g', description: 'Surface the plan choice at review and carry it to the PDF and payment link.', tasks: ['Selector UI', 'PDF field', 'Payment page schedule'], ac: ['Selector shows on the review step', 'Selected plan is reflected on the PDF and payment link'] },
      { summary: 'Handle missed instalments and pause the policy', component: 'proposalService.js', points: 5, verdict: 'r', description: 'When two consecutive EMI instalments are missed, transition the policy to PAUSED and block new claims until payment resumes.', tasks: ['Track missed-instalment count per policy', 'Pause status + claims gate', 'Auto-resume on payment received'], ac: ['Given two consecutive missed instalments, the policy status becomes PAUSED', 'Given a PAUSED policy, new claims are rejected until payment resumes', 'Given payment resumes, the policy status returns to ACTIVE automatically'] }
    ],
    test_suites: [
      { story: 'Add MONTHLY payment frequency to rating engine', cases: [
        { id: 'TC-01', title: 'Monthly instalment computed correctly', gherkin: 'Given an annual premium of ₹24,000\nWhen the customer selects MONTHLY\nThen each instalment is ₹2,000 with no interest' },
        { id: 'TC-02', title: 'Annual flow unchanged', gherkin: 'Given a customer keeps ANNUAL\nWhen the premium is rated\nThen the result matches the pre-change baseline' }
      ] },
      { story: 'Payment-plan selector in journey review step', cases: [
        { id: 'TC-03', title: 'Payment plan persists to PDF', gherkin: 'Given a customer selects MONTHLY at review\nWhen the proposal PDF is generated\nThen it shows the instalment schedule' }
      ] },
      { story: 'Handle missed instalments and pause the policy', cases: [
        { id: 'TC-04', title: 'Policy pauses after two missed instalments', gherkin: 'Given a MONTHLY policy has missed 2 consecutive instalments\nWhen the payment scheduler runs\nThen the policy status becomes PAUSED' },
        { id: 'TC-05', title: 'Paused policy blocks new claims', gherkin: 'Given a policy is PAUSED\nWhen a new claim is submitted\nThen it is rejected with a payment-due message' }
      ] }
    ]
  };

  return {
    models: [],           // BYO model connections (Settings → Model Hub)
    activeModelId: null,
    projects: [
      {
        id: 'proj-emi', name: 'EMI & Payment Flexibility',
        about: 'Give customers more ways to pay premiums without breaking the annual-only rating engine.',
        createdAt: now(),
        research: [
          { id: R1, title: 'Churn interviews — why customers drop at quote', source: 'upload', sourceDetail: 'churn-interviews-jun.pdf', createdAt: now(), content: '12 exit interviews with customers who abandoned at the quote step.\n\nKey pattern: 9 of 12 cited the size of the single annual payment, not the premium itself. Three said verbatim they would have bought "if I could pay like a phone bill."\n\nSecondary: two flagged confusion about what happens if they miss a payment — worth addressing in any instalment design.' },
          { id: R2, title: 'Current rating engine constraints', source: 'ai', createdAt: now(), content: 'Saved from a Feasly conversation.\n\nThe rating engine only supports annual payment: premium.rules.yaml pins payment_frequency_options to [ANNUAL], and calculate() produces a single annual figure — there is no schedule concept anywhere in core. Any instalment feature is a core change (red), not a journey-side rendering trick.\n\nThe proposal-v2 API contract also serialises a single payment_frequency string, so consumers must be versioned.' },
          { id: R3, title: 'Payment gateway capabilities — recurring mandates', source: 'api', sourceDetail: 'Imported from gateway API docs', createdAt: now(), content: 'Imported from API documentation.\n\nThe gateway supports tokenised recurring mandates (UPI Autopay + card standing instructions) with per-instalment webhooks.\n\nRelevant limits: mandate ceiling ₹15,000/instalment without re-auth; webhook retries for 72h; refunds must reference the original instalment id.\n\nNo built-in default handling — if an instalment fails, the product has to decide what happens next.' }
        ],
        conversations: [
          {
            id: 'c-emi', title: 'Can we support EMI payments?', updatedAt: now(),
            messages: [
              { role: 'assistant', content: "Hi! I'm Feasly, connected to the Zenith Health tenant — code, contracts and docs. Ask me anything.", engine: 'deterministic' },
              { role: 'user', content: 'Can we support EMI payments?' },
              { role: 'assistant', content: 'Not today — premium.rules.yaml pins payment_frequency_options to [ANNUAL], and the rating engine produces a single annual figure with no schedule concept. It\'s a core change plus an API v2 contract bump. I\'ve saved the full constraint breakdown to Research.', engine: 'deterministic', savedAsResearchId: R2 },
              { role: 'user', content: 'What would it take from a payments perspective — is the gateway even capable of recurring collection?' },
              { role: 'assistant', content: "Yes — the gateway supports tokenised recurring mandates via UPI Autopay and card standing instructions, with a webhook per instalment. Two things worth flagging before you scope requirements: a ₹15,000 mandate ceiling without re-auth, and it doesn't handle defaults for you — the product has to define what happens when an instalment fails. I've saved this to Research too.", engine: 'deterministic', savedAsResearchId: R3 }
            ]
          },
          {
            id: 'c-emi-default', title: 'How should we handle missed EMI instalments?', updatedAt: now(),
            messages: [
              { role: 'assistant', content: "Hi! I'm Feasly, connected to the Zenith Health tenant — code, contracts and docs. Ask me anything.", engine: 'deterministic' },
              { role: 'user', content: "Given the gateway won't handle defaults for us, what's a sane rule for missed EMI payments on a health policy?" },
              { role: 'assistant', content: 'Given the webhook retries for 72h before giving up, a reasonable rule: after two consecutive missed instalments, pause the policy and block new claims until payment resumes, then auto-reactivate. That keeps underwriting risk bounded without cancelling cover outright over a single missed payment. Want me to add this to the BRD as a requirement?', engine: 'deterministic' },
              { role: 'user', content: "Yes — add it. Let's get underwriting's sign-off on that exact wording before we lock the BRD." },
              { role: 'assistant', content: 'Added as a new requirement on "Offer monthly premium payment (EMI)" — save a new BRD version once underwriting confirms the wording, and I\'ll flag every PDN, epic, story and test generated from the old version as needing review.', engine: 'deterministic' }
            ]
          }
        ],
        brds: [
          {
            id: B1, title: 'Offer monthly premium payment (EMI)', owner: 'PM', status: 'Approved',
            researchIds: [R1, R2, R3], sections: brdSections, createdAt: now(),
            versions: [
              { v: 1, ts: now(), note: 'Initial draft from churn research + rating-engine conversation', sections: { ...brdSections, requirements: brdSections.requirements.slice(0, 3), background: brdSections.background.replace(' v2 adds the default-handling rule underwriting asked for after a payments-feasibility conversation.', '') } },
              { v: 2, ts: now(), note: 'Added default-handling requirement after the missed-instalments conversation + underwriting sign-off', sections: brdSections }
            ]
          },
          {
            id: B2, title: 'Quarterly payment option', owner: 'PM', status: 'Draft',
            researchIds: [R1], createdAt: now(),
            sections: { background: 'A middle ground for customers who find annual too large but distrust a 12-month commitment.', requirements: ['Offer quarterly premium alongside annual', 'Prorate existing tenure discounts'], stakeholders: 'Payments team', success: '' },
            versions: [{ v: 1, ts: now(), note: 'Initial draft', sections: { background: 'A middle ground for customers who find annual too large but distrust a 12-month commitment.', requirements: ['Offer quarterly premium alongside annual', 'Prorate existing tenure discounts'], stakeholders: 'Payments team', success: '' } }]
          }
        ],
        // Generated from the CURRENT BRD version (v2) — nothing stale here;
        // every epic/story/FR/test below maps to one of its 4 requirements.
        pdns: [{ id: P1, title: 'PDN — Offer monthly premium payment (EMI)', brdId: B1, brdVersion: 2, researchIds: [R1, R2, R3], content: analysis.pdn_markdown + '\n\n---\n_Generated from BRD "Offer monthly premium payment (EMI)" v2 · 4/6 impacts verified against source code._', analysis, createdAt: now() }],
        epics: [
          { id: E1, pdnId: P1, title: 'Core rating engine — instalment support', system: 'Core policy system', summary: 'Add MONTHLY to payment_frequency_options. Add EMI schedule + interest-free instalment calc.', createdAt: now() },
          { id: E2, pdnId: P1, title: 'Journey & contract — payment-plan experience', system: 'Journey app', summary: 'Version the proposal-v2 contract, add the payment-plan selector to review, and show the schedule on the payment page.', createdAt: now() },
          { id: E3, pdnId: P1, title: 'Default handling — pause & resume', system: 'Core policy system', summary: 'Track missed instalments and pause the policy after two consecutive misses; block claims while paused; auto-resume once payment lands.', createdAt: now() }
        ],
        stories: [
          { id: S1, epicId: E1, title: 'Add MONTHLY payment frequency to rating engine', component: 'premium.rules.yaml', points: 5, description: 'Extend payment_frequency_options and compute the instalment schedule.', ac: ['Given an ANNUAL premium, monthly instalment = annual/12 with no interest', 'Existing ANNUAL flow is unaffected'], createdAt: now() },
          { id: S2, epicId: E2, title: 'Version proposal-v2 contract for payment_plan', component: 'proposal-v2.contract.json', points: 3, description: 'Add the payment_plan field behind a version bump.', ac: ['New field is optional and backward compatible', 'Consumers are notified via changelog'], createdAt: now() },
          { id: S3, epicId: E2, title: 'Payment-plan selector in journey review step', component: 'steps.jsx', points: 5, description: 'Surface the plan choice at review and carry it to the PDF and payment link.', ac: ['Selector shows on the review step', 'Selected plan is reflected on the PDF and payment link'], createdAt: now() },
          { id: S4, epicId: E3, title: 'Handle missed instalments and pause the policy', component: 'proposalService.js', points: 5, description: 'When two consecutive EMI instalments are missed, transition the policy to PAUSED and block new claims until payment resumes.', ac: ['Given two consecutive missed instalments, the policy status becomes PAUSED', 'Given a PAUSED policy, new claims are rejected until payment resumes', 'Given payment resumes, the policy status returns to ACTIVE automatically'], createdAt: now() }
        ],
        frs: [
          { id: F1, storyId: S1, title: 'FR — Monthly instalment equals annual/12, interest-free', description: 'The system shall divide the rated annual premium into 12 equal interest-free instalments when MONTHLY is selected.', createdAt: now() },
          { id: F2, storyId: S1, title: 'FR — Annual rating path unchanged', description: 'The system shall produce byte-identical results for ANNUAL policies before and after the change.', createdAt: now() },
          { id: F3, storyId: S2, title: 'FR — payment_plan is optional and backward compatible', description: 'The system shall accept proposal-v2 payloads with or without payment_plan.', createdAt: now() },
          { id: F4, storyId: S3, title: 'FR — Review step exposes the payment-plan selector', description: 'The system shall render the payment-plan selector on the review step with ANNUAL preselected.', createdAt: now() },
          { id: F5, storyId: S3, title: 'FR — Proposal PDF carries the instalment schedule', description: 'The system shall include the selected schedule in the generated proposal PDF.', createdAt: now() },
          { id: F6, storyId: S4, title: 'FR — Two consecutive missed instalments pause the policy', description: 'The system shall transition a MONTHLY policy to PAUSED when two consecutive instalments are missed.', createdAt: now() },
          { id: F7, storyId: S4, title: 'FR — Paused policy rejects new claims', description: 'The system shall reject new claims on a PAUSED policy until payment resumes.', createdAt: now() },
          { id: F8, storyId: S4, title: 'FR — Policy auto-resumes once payment lands', description: 'The system shall automatically return a PAUSED policy to ACTIVE once the missed instalment is paid.', createdAt: now() }
        ],
        tests: [
          { id: 't-01', frId: F1, title: 'Monthly instalment computed correctly', gherkin: 'Given an annual premium of ₹24,000\nWhen the customer selects MONTHLY\nThen each instalment is ₹2,000 with no interest', createdAt: now() },
          { id: 't-02', frId: F2, title: 'Annual flow unchanged', gherkin: 'Given a customer keeps ANNUAL\nWhen the premium is rated\nThen the result matches the pre-change baseline', createdAt: now() },
          { id: 't-03', frId: F3, title: 'Old consumers unaffected by new field', gherkin: 'Given a consumer on contract v2.0\nWhen a proposal without payment_plan is submitted\nThen it is accepted unchanged', createdAt: now() },
          { id: 't-04', frId: F4, title: 'Selector defaults to ANNUAL', gherkin: 'Given a customer reaches the review step\nWhen the payment-plan selector renders\nThen ANNUAL is preselected', createdAt: now() },
          { id: 't-05', frId: F5, title: 'Payment plan persists to PDF', gherkin: 'Given a customer selects MONTHLY at review\nWhen the proposal PDF is generated\nThen it shows the instalment schedule', createdAt: now() },
          { id: 't-06', frId: F6, title: 'Policy pauses after two missed instalments', gherkin: 'Given a MONTHLY policy has missed 2 consecutive instalments\nWhen the payment scheduler runs\nThen the policy status becomes PAUSED', createdAt: now() },
          { id: 't-07', frId: F7, title: 'Paused policy blocks new claims', gherkin: 'Given a policy is PAUSED\nWhen a new claim is submitted\nThen it is rejected with a payment-due message', createdAt: now() },
          { id: 't-08', frId: F8, title: 'Policy auto-resumes on payment', gherkin: 'Given a PAUSED policy receives the missed instalment\nWhen the payment webhook confirms receipt\nThen the policy status returns to ACTIVE', createdAt: now() }
        ],
        releases: [
          { id: 'rel-1', name: 'R-2026.08 — EMI foundations', date: '2026-08-15', storyIds: [S1, S2], createdAt: now() },
          { id: 'rel-2', name: 'R-2026.09 — EMI experience & default handling', date: '2026-09-05', storyIds: [S3, S4], createdAt: now() }
        ]
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
