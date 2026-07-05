// Feasly workspace store — localStorage-backed, demo-grade persistence for
// projects, BRDs, chats, planner items and model connections. Every page
// reads through loadWS/saveWS so state survives reloads and the journey
// handoff. v2 introduces the BRD pipeline (draft -> locked -> generated)
// nested per-project, replacing the old standalone artifacts/books arrays.

const KEY = 'feasly-workspace-v2';

const emptyBrdSections = () => ({ background: '', requirements: [], stakeholders: '', success: '' });

// Seed data — ports the design prototype's demo state so a fresh workspace
// shows a populated, convincing pipeline (Dashboard, project cards, recent
// artifacts) instead of an empty shell on first visit.
function seedState() {
  return {
    chats: [
      {
        id: 'ac1', kind: 'chat', title: 'Can we support EMI payments?', projectId: null, bookId: null,
        createdAt: now(), updatedAt: now(),
        messages: [
          { role: 'assistant', content: "Hi! I'm your Feasly copilot, connected to the Zenith Health tenant. Ask me a feasibility question and I'll answer from the actual codebase, with evidence.", engine: 'deterministic' },
          { role: 'user', content: 'Can we support EMI payments?' },
          { role: 'assistant', content: "Not today — premium.rules.yaml hardcodes payment_frequency_options: [ANNUAL]. It's a core rating-engine change plus an API v2 contract bump. I've grounded the full breakdown in the 'Offer monthly premium payment (EMI)' BRD under EMI & Payment Flexibility — verdict Red, 13 points.", engine: 'deterministic' }
        ]
      }
    ],
    projects: [
      {
        id: 'p1', name: 'EMI & Payment Flexibility',
        about: 'Give customers more ways to pay premiums without breaking the annual-only rating engine.',
        files: [], createdAt: now(),
        brds: [
          {
            id: 'b1', title: 'Offer monthly premium payment (EMI) instead of annual only',
            status: 'generated', lockedAt: 'locked today', createdAt: now(),
            sections: {
              background: 'Customers on annual-only plans cite cash-flow strain as the #1 reason for not converting at quote stage. Competitors offer monthly EMI; we currently only support ANNUAL.',
              requirements: ['Offer a monthly EMI option alongside annual at quote and checkout', 'Compute an interest-free instalment schedule from the annual premium', 'Reflect the payment plan on the review screen and proposal PDF'],
              stakeholders: 'Underwriting, Payments team, D2C Journey PM',
              success: 'EMI adoption ≥20% of new policies within one quarter of launch; no increase in payment-default rate.'
            },
            analysis: {
              overall: 'r', verdictLabel: 'Red — touches core rating engine', points: 13, sprints: '~1 sprint', verified: '3/5',
              impacts: [
                { dot: '🔴', system: 'Core policy system', change: 'Add MONTHLY to payment_frequency_options', evidenceText: 'L6: payment_frequency_options: [ANNUAL]' },
                { dot: '🔴', system: 'Core policy system', change: 'Add EMI schedule + interest-free instalment calc', evidenceText: 'L43: function calculate(p) {' },
                { dot: '🟠', system: 'API contract (v2)', change: 'Add payment_plan field — version bump, coordinate consumers', evidenceText: 'L9: "payment_frequency": "ANNUAL",' },
                { dot: '🟢', system: 'Journey app', change: 'Add payment-plan selector to review step', evidenceText: 'not found — verify manually' },
                { dot: '🟢', system: 'Journey app', change: 'Show instalment schedule on payment link page', evidenceText: 'not found — verify manually' }
              ]
            },
            artifacts: {
              pdn: '# PDN — Offer monthly premium payment (EMI)\n\n## Impacted systems\n- Core policy system (rating engine, DB)\n- API contract v2 (versioned field)\n- Journey app (UI only)\n\n## Business rules\nAnnual premium divided into 12 interest-free instalments; no change to underwriting outcome.\n\n## Sequencing\n1. Core: rule + schedule calc\n2. Contract: version bump, notify consumers\n3. Journey: selector UI, review + PDF\n\n## Open questions\n- Do we support part-payment default handling in v1?\n\n## Sign-offs\n- [ ] Underwriting\n- [ ] Payments\n- [ ] Compliance',
              stories: '## Story 1 — Add MONTHLY payment frequency to rating engine\n\n**Component:** premium.rules.yaml · **Points:** 5\n\nExtend payment_frequency_options and compute instalment schedule.\n\n**Acceptance criteria**\n- Given ANNUAL premium, monthly instalment = annual/12, no interest\n- Existing ANNUAL flow unaffected\n\n## Story 2 — Version proposal-v2 contract for payment_plan\n\n**Component:** proposal-v2.contract.json · **Points:** 3\n\n**Acceptance criteria**\n- New optional field, backward compatible\n- Consumers notified via changelog\n\n## Story 3 — Payment-plan selector in journey\n\n**Component:** steps.jsx · **Points:** 5\n\n**Acceptance criteria**\n- Selector shows on review step\n- Selected plan reflected on PDF and payment link',
              tests: '## Rating engine\n\n### TC-01 — Monthly instalment computed correctly\n\n```gherkin\nGiven an annual premium of ₹24,000\nWhen the customer selects MONTHLY\nThen each instalment is ₹2,000 with no interest\n```\n\n## Journey\n\n### TC-02 — Payment plan persists to PDF\n\n```gherkin\nGiven a customer selects MONTHLY at review\nWhen the proposal PDF is generated\nThen it shows the instalment schedule\n```'
            }
          },
          {
            id: 'b2', title: 'Add quarterly payment option',
            status: 'locked', lockedAt: 'locked yesterday', createdAt: now(),
            sections: {
              background: "Customers who find annual too large and are wary of monthly EMI's longer commitment want a middle ground. Support quarterly billing.",
              requirements: ['Offer quarterly premium option alongside annual', 'Show quarterly amount in quote and review screens', 'Apply same discount rules as annual, prorated'],
              stakeholders: 'Underwriting, Payments team, D2C Journey PM',
              success: '≥15% of new policies choose quarterly within the first quarter after launch.'
            },
            analysis: null, artifacts: null
          }
        ]
      },
      {
        id: 'p2', name: 'Nominee & KYC Enhancements',
        about: 'Compliance-driven improvements to nominee capture and proposer identity checks.',
        files: [], createdAt: now(),
        brds: [
          {
            id: 'b3', title: 'Make nominee details mandatory',
            status: 'draft', lockedAt: null, createdAt: now(),
            sections: {
              background: 'Nominee is currently optional at proposal; internal data shows a 41% skip rate. Compliance wants nominee capture to become mandatory for all new policies.',
              requirements: ['Nominee section becomes required, not skippable, at proposal step', 'Block proposal submission until nominee name, relationship and DOB are filled'],
              stakeholders: 'Compliance, Underwriting, D2C Journey PM',
              success: ''
            },
            analysis: null, artifacts: null
          },
          {
            id: 'b4', title: 'Capture PAN for proposer',
            status: 'generated', lockedAt: 'locked 2 days ago', createdAt: now(),
            sections: {
              background: 'KYC guidelines require PAN capture above a premium threshold. PAN is now a mandatory proposer field ahead of that rollout.',
              requirements: ['Add proposer PAN field to details step', 'Validate PAN format client-side before submission', 'Store PAN alongside other proposer fields in the v2 contract'],
              stakeholders: 'Compliance, D2C Journey PM',
              success: 'PAN capture available with zero increase in details-step drop-off.'
            },
            analysis: {
              overall: 'a', verdictLabel: 'Amber — API contract change, journey-only otherwise', points: 8, sprints: '~half sprint', verified: '2/3',
              impacts: [
                { dot: '🟠', system: 'API contract (v2)', change: 'Add optional proposer_pan field', evidenceText: 'L14: "proposer": { "name": "", "mobile": "" }' },
                { dot: '🟢', system: 'Journey app', change: 'Add PAN input to proposer details form', evidenceText: 'not found — verify manually' },
                { dot: '🟢', system: 'Journey app', change: 'Add PAN format validator (regex)', evidenceText: 'L74: export const isPanFormat = (v) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v || \'\');' }
              ]
            },
            artifacts: {
              pdn: '# PDN — Capture PAN for proposer\n\n## Impacted systems\n- API contract v2 (new optional field)\n- Journey app (form + validation)\n\n## Sequencing\n1. Contract: add optional field\n2. Journey: input + validator\n\n## Sign-offs\n- [ ] Compliance\n- [ ] Journey PM',
              stories: '## Story 1 — Add proposer_pan to v2 contract\n\n**Points:** 2\n\n**Acceptance criteria**\n- Field optional, backward compatible\n\n## Story 2 — PAN input + validation on details step\n\n**Points:** 3\n\n**Acceptance criteria**\n- Client-side regex validation\n- Inline error on invalid format',
              tests: '### TC-01 — Valid PAN accepted\n\n```gherkin\nGiven a proposer enters a valid PAN\nWhen they submit the details step\nThen the value is stored on the proposal\n```\n\n### TC-02 — Invalid PAN blocked\n\n```gherkin\nGiven a proposer enters an invalid PAN\nWhen they try to continue\nThen an inline error is shown\n```'
            }
          }
        ]
      }
    ],
    tasks: [
      { id: 't1', title: 'Review EMI PDN with underwriting', due: '2026-07-07', remind: false, done: false, createdAt: now() },
      { id: 't2', title: 'Sync with payments team on quarterly billing', due: '2026-07-06', remind: false, done: false, createdAt: now() },
      { id: 't3', title: 'Confirm nominee mandatory rollout date', due: '2026-07-03', remind: false, done: true, createdAt: now() }
    ],
    events: [
      { id: 'e1', title: 'Underwriting sign-off call', time: '11:00' },
      { id: 'e2', title: 'Jira grooming — payments epic', time: '15:30' }
    ],
    models: [],
    connectors: { outlook: false, gmail: true },
    activeModelId: null,
    activity: [
      { icon: '⚡', text: "PDN generated for 'Offer monthly premium payment (EMI)'", time: '12 min ago' },
      { icon: '🔒', text: "BRD locked: 'Add quarterly payment option'", time: '1 hr ago' },
      { icon: '🧪', text: "Test cases generated for 'Capture PAN for proposer'", time: '3 hrs ago' },
      { icon: '📝', text: "New BRD created: 'Make nominee details mandatory'", time: '1 day ago' },
      { icon: '🔌', text: 'Connected systems re-indexed (push to zenith-core-service)', time: '1 day ago' }
    ]
  };
}

const EMPTY = {
  chats: [], projects: [], tasks: [], events: [], models: [],
  connectors: { outlook: false, gmail: false }, activeModelId: null, activity: []
};

export function loadWS() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return saveWS(seedState());       // first-ever visit: seed a populated demo
    return { ...EMPTY, ...(JSON.parse(raw) || {}) };
  } catch { return { ...EMPTY }; }
}
export function saveWS(next) {
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}
export const uid = () => Math.random().toString(36).slice(2, 9);
export const now = () => new Date().toISOString();

export function activeModelLabel(ws) {
  const m = (ws.models || []).find((x) => x.id === ws.activeModelId);
  return m ? m.name : 'Feasly demo brain (offline)';
}

// ---- project / BRD lookups + immutable updates ----
export const findProject = (ws, projectId) => (ws.projects || []).find((p) => p.id === projectId) || null;
export const findBrd = (ws, projectId, brdId) => {
  const p = findProject(ws, projectId);
  return p ? p.brds.find((b) => b.id === brdId) || null : null;
};
export function updateProject(ws, projectId, patch) {
  return { ...ws, projects: ws.projects.map((p) => (p.id === projectId ? { ...p, ...patch } : p)) };
}
export function updateBrd(ws, projectId, brdId, patch) {
  return updateProject(ws, projectId, {
    brds: findProject(ws, projectId).brds.map((b) => (b.id === brdId ? { ...b, ...patch } : b))
  });
}
export function updateBrdSections(ws, projectId, brdId, patch) {
  const brd = findBrd(ws, projectId, brdId);
  return updateBrd(ws, projectId, brdId, { sections: { ...brd.sections, ...patch } });
}
export function newBrd(title) {
  return { id: uid(), title, status: 'draft', lockedAt: null, createdAt: now(), sections: emptyBrdSections(), analysis: null, artifacts: null };
}
export const brdStatusMeta = (brd) => ({
  emoji: brd.status === 'draft' ? '⚪' : brd.status === 'locked' ? '🔒' : (DOT[brd.analysis?.overall] || '✓'),
  label: brd.status === 'draft' ? 'Draft' : brd.status === 'locked' ? 'Locked' : 'Generated'
});
export const DOT = { g: '🟢', a: '🟠', r: '🔴' };

// BRD Assistant sample chips — matching background copy, so one click can
// fill a fresh BRD's background + first requirement in a single step.
export const BRD_SAMPLES = [
  { req: 'Offer monthly premium payment (EMI) instead of annual only', bg: 'Customers on annual-only plans cite cash-flow strain as the #1 reason for not converting at quote stage. Competitors offer monthly EMI; we currently only support ANNUAL.' },
  { req: 'Add a ₹2 crore sum insured band', bg: 'High-net-worth customers are quoting elsewhere because our maximum sum insured band tops out below what competitors offer.' },
  { req: 'Allow customers to add parents-in-law as covered members', bg: 'Joint-family households want parents-in-law covered under the same policy — today only self, spouse, children and parents are supported relationships.' },
  { req: 'Show PED waiting period per member on the review screen', bg: 'Customers with pre-existing conditions are surprised by waiting periods after purchase. Surface the per-member PED waiting period clearly before payment.' }
];

// ---- artifact markdown builders (from an /analyze result) ----
export function storiesToMd(r) {
  return (r.stories || []).map((s, i) =>
    `## Story ${i + 1} — ${s.summary}\n\n` +
    `**Component:** ${s.component} · **Points:** ${s.points}\n\n${s.description}\n\n` +
    `**Tasks**\n${s.tasks.map((t) => `- ${t}`).join('\n')}\n\n` +
    `**Acceptance criteria**\n${s.ac.map((a) => `- ${a}`).join('\n')}\n`
  ).join('\n');
}
export function testsToMd(r) {
  return (r.test_suites || []).map((suite) =>
    `## ${suite.story}\n\n` +
    suite.cases.map((c) => `### ${c.id} — ${c.title}\n\n\`\`\`gherkin\n${c.gherkin}\n\`\`\`\n`).join('\n')
  ).join('\n');
}
export function pdnFallbackMd(r) {
  return r.pdn_markdown || `# PDN — ${r.text}\n\nVerdict: ${r.verdict_label}`;
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
