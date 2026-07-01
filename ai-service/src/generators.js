// PDN, Jira stories, and test-case generation from one analysis result.
const { LAYERS } = require('./knowledge');
const V = { g: '🟢 Green', a: '🟠 Amber', r: '🔴 Red' };
const VERDICT_LABEL = {
  g: 'Green — frontend-only change, no core dependency',
  a: 'Amber — API contract change, coordinated release',
  r: 'Red — core system change required'
};

function pdn(r) {
  const d = new Date().toISOString().slice(0, 10);
  let md = `# Product Development Note (PDN)\n\n`;
  md += `**Change:** ${r.text}\n**Date:** ${d} · **Author:** Product (AI-drafted, pending Tech review)\n`;
  md += `**Overall feasibility:** ${VERDICT_LABEL[r.overall]}\n**Effort:** ${r.size} · ${r.sprints}\n`;
  md += `**Code evidence:** ${r.verified}/${r.impacts.length} impacts verified against source\n\n`;

  md += `## 1. Change description & rationale\n\n${r.text}. Business rationale to be attached by Product.\n\n`;

  md += `## 2. Impacted systems & components\n\n| System | Component | Verdict | Required change | Evidence |\n|---|---|---|---|---|\n`;
  for (const i of r.impacts) {
    const ev = i.evidence ? `L${i.evidence.line}: \`${i.evidence.snippet.replace(/\|/g, '\\|')}\`` : '⚠ not found — verify manually';
    md += `| ${LAYERS[i.layer].system} | \`${i.file.split('/').slice(-2).join('/')}\` | ${V[i.v]} | ${i.change} | ${ev} |\n`;
  }

  const core = r.impacts.filter(i => i.layer === 'core');
  md += `\n## 3. Business rules affected\n\n${core.length ? core.map(i => `- \`${i.file}\`: ${i.change}`).join('\n') : 'None — no core business-rule change.'}\n\n`;

  const api = r.impacts.filter(i => i.layer === 'api');
  md += `## 4. API contract impact\n\n${api.length ? api.map(i => `- ${i.change}`).join('\n') : 'No contract change.'}\n\n`;

  md += `## 5. Dependencies & sequencing\n\n`;
  md += r.coreChange
    ? `Core gates delivery: rules/schema first (core release train) → API contract → journey frontend last. Frontend can start behind a feature flag against a contract stub.\n\n`
    : `No core dependency — API and frontend ship in one coordinated release.\n\n`;

  md += `## 6. Risks\n\n${r.risks.map(x => `- ${x}`).join('\n')}\n\n`;
  md += `## 7. Open questions for Tech review\n\n${r.openq.map(x => `- ${x}`).join('\n')}\n\n`;
  md += `## 8. Sign-offs\n\n- [ ] Core architecture\n- [ ] Journey tech lead\n${r.coreChange ? '- [ ] Underwriting / Actuarial\n- [ ] DBA (migration)\n' : ''}- [ ] QA (regression scope)\n`;
  return md;
}

function stories(r) {
  const byLayer = {};
  for (const i of r.impacts) (byLayer[i.layer] = byLayer[i.layer] || []).push(i);
  const pts = { g: 3, a: 5, r: 8 };
  const out = [];
  for (const lid of ['core', 'db', 'api', 'frontend']) {
    if (!byLayer[lid]) continue;
    const L = LAYERS[lid];
    const items = byLayer[lid];
    const v = items.map(i => i.v).includes('r') ? 'r' : items.map(i => i.v).includes('a') ? 'a' : 'g';
    out.push({
      key: lid,
      summary: `[${L.label}] ${r.text}`,
      component: L.system, points: pts[v], verdict: v,
      description: `Implements the ${L.label.toLowerCase()} portion of: "${r.text}".`,
      tasks: items.map(i => `${i.file}: ${i.change}`),
      ac: [
        `Given the change is deployed, when the issuance journey runs end-to-end, then behavior matches PDN for ${items.map(i => i.file.split('/').pop()).join(', ')}`,
        lid === 'api' ? 'Given existing v2 consumers calling unchanged, then contract tests stay green (no breaking change unversioned)'
          : lid === 'db' ? 'Given the migration on a production-size copy, then it completes in the window and is reversible'
          : lid === 'core' ? 'Given updated rules, when the premium/underwriting regression pack runs, then all existing scenarios pass'
          : 'Given the updated journey, then funnel analytics capture the changed step and no journey step regresses on completion rate'
      ]
    });
  }
  out.push({
    key: 'qa',
    summary: `[QA] ${r.text} — cross-system regression`,
    component: 'core-service + journey-app', points: 5, verdict: r.overall,
    description: `E2E regression across journey → API → core for: "${r.text}".`,
    tasks: [`Regression pack over: ${[...new Set(r.files)].join(', ')}`],
    ac: ['Given the full change set, when E2E issuance scenarios run (D2C + agent + payment link), then premium, persistence, and issuance are correct']
  });
  return out;
}

function testCases(r, storyList) {
  const suites = [];
  for (const s of storyList) {
    const cases = [];
    if (s.key === 'frontend') {
      cases.push(
        { id: 'FE-01', title: 'Changed journey step renders and validates', gherkin: `Given a customer on the issuance journey\nWhen they reach the step affected by "${r.text}"\nThen the new behavior is visible and client-side validation matches core rules` },
        { id: 'FE-02', title: 'Agent portal parity', gherkin: `Given an agent doing the journey on behalf of a customer\nWhen they pass the affected step\nThen behavior is identical to the D2C journey` }
      );
    }
    if (s.key === 'api') {
      cases.push(
        { id: 'API-01', title: 'New/changed field round-trips', gherkin: `Given a proposal created via POST /v2/proposals with the changed contract\nWhen the proposal form is fetched via GET /v2/proposals/:id/form\nThen the changed field is present and correct` },
        { id: 'API-02', title: 'Backward compatibility', gherkin: `Given an existing v2 consumer payload without the new field\nWhen it calls the endpoint\nThen the request succeeds with pre-change behavior (or a versioned 4xx if breaking by design)` }
      );
    }
    if (s.key === 'core') {
      cases.push(
        { id: 'CORE-01', title: 'Rule change applies to premium/eligibility', gherkin: `Given the updated business rules\nWhen a proposal exercising the change is rated\nThen premium and eligibility reflect the new rule and are traceable to the rules file` },
        { id: 'CORE-02', title: 'Existing scenarios unchanged', gherkin: `Given the pre-change regression baseline\nWhen the full rating pack re-runs\nThen all baseline premiums are unchanged` }
      );
    }
    if (s.key === 'db') {
      cases.push(
        { id: 'DB-01', title: 'Migration forward + rollback', gherkin: `Given a production-size data copy\nWhen the schema migration runs\nThen it completes in the agreed window, and rollback restores the prior constraint without data loss` }
      );
    }
    if (s.key === 'qa') {
      cases.push(
        { id: 'E2E-01', title: 'D2C happy path issues policy', gherkin: `Given a customer completes members → medical → quote → proposer → review\nWhen payment is confirmed\nThen the proposal moves DRAFT → SUBMITTED → ISSUED and a policy number is generated` },
        { id: 'E2E-02', title: 'Agent payment-link flow', gherkin: `Given an agent submits a proposal and sends a payment link\nWhen the customer pays via the link\nThen the agent dashboard shows ISSUED and the link cannot be reused` },
        { id: 'E2E-03', title: 'Premium consistency', gherkin: `Given the same inputs on D2C and agent journeys\nWhen premium is calculated\nThen both channels return identical premium breakups` }
      );
    }
    suites.push({ story: s.summary, cases });
  }
  return suites;
}

module.exports = { pdn, stories, testCases, VERDICT_LABEL };
