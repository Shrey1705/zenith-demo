// Feasly's PM copilot — deterministic demo brain.
// The demo must run offline and never hallucinate a dependency, so this
// routes by intent: feasibility-shaped questions get REAL code-grounded
// answers from the analyzer; common PM asks get structured templates.
// When ANTHROPIC_API_KEY is set, app.js proxies /chat to a live LLM
// instead and this file becomes the fallback — plug-and-play by design.
const { analyze } = require('./analyzer');
const gen = require('./generators');

function feasibilityReply(text) {
  const r = analyze(text);
  if (!r.matched) return null;
  const evidence = r.impacts
    .filter((i) => i.evidence)
    .slice(0, 3)
    .map((i) => `• ${i.file}:${i.evidence.line} — "${i.evidence.snippet}"`)
    .join('\n');
  return `🚦 That reads like a feasibility question — here's the code-grounded answer:

${gen.VERDICT_LABEL[r.overall]}
Effort: ${gen.SIZE_POINTS[r.size]} story points (${r.size}) · ${r.sprints}
Verified: ${r.verified}/${r.impacts.length} impacts against live source.

Top evidence:
${evidence}

Open Feasibility Studio and run this exact question for the full PDN draft, Jira-ready stories and Gherkin test cases.`;
}

const INTENTS = [
  {
    match: /\b(prd|brd|spec|product requirement)\b/i,
    reply: `Here's a PRD skeleton I'd start from:

1. Problem — who hurts, how often, evidence (support tickets, funnel data)
2. Goals & non-goals — 2–3 measurable goals; be explicit about what's out
3. Users & jobs — primary persona + the job-to-be-done
4. Proposed solution — narrative first, wireframe second
5. Feasibility & system impact — run it through Feasibility Studio and paste the verdict + evidence table here
6. Success metrics — leading (activation on the new flow) + lagging (retention, loss ratio)
7. Risks & open questions — the ones you'd want Tech/UW to challenge
8. Rollout — flag, cohort, or big-bang; how you'd unwind it

Tip: section 5 is what usually gets a PRD stuck in review — attaching code evidence up front is how you skip a review cycle.`
  },
  {
    match: /\b(rice|prioriti[sz]e|prioriti[sz]ation|ice score)\b/i,
    reply: `RICE in 30 seconds — score = (Reach × Impact × Confidence) ÷ Effort.

• Reach: users/quarter touched (use funnel data, not gut)
• Impact: 3 massive · 2 high · 1 medium · 0.5 low · 0.25 minimal
• Confidence: 100% shipped-before · 80% strong data · 50% hunch
• Effort: person-months — pull this from Feasibility Studio's story points instead of guessing

Example on this codebase: "monthly EMI payments" scores huge Reach but Effort 13 pts + an actuarial dependency, so its RICE lands *below* "make nominee mandatory" (3 pts, config-level). That inversion is exactly what RICE is for.`
  },
  {
    match: /\b(roadmap|now next later|quarter plan)\b/i,
    reply: `For a roadmap I'd default to Now / Next / Later over dated Gantt bars:

• Now — committed, feasibility-verified (Green/Amber verdicts only)
• Next — sized and de-risked, waiting on capacity; Red verdicts live here *only* after sign-offs are sequenced
• Later — directional bets, no promises

Rule of thumb from this codebase: anything touching core rules or the DB schema (Red) rides a release train — sequence those first, and let frontend-only work (Green) fill the gaps between trains.`
  },
  {
    match: /\b(standup|status update|weekly update)\b/i,
    reply: `Standup template that keeps you to 45 seconds:

Yesterday: shipped / decided / learned (1 line each)
Today: the ONE thing that moves the goal
Blocked: name the person + the ask, not just the problem

For weekly stakeholder updates, lead with the health color and the single decision you need from them — detail goes below the fold.`
  },
  {
    match: /\b(metric|kpi|okr|measure)\b/i,
    reply: `For an insurance purchase journey like Zenith's, I'd instrument:

• Quote-to-issue conversion (the headline funnel)
• Step drop-off — especially medical declarations and payment
• Quote latency P95 (the premium panel must feel instant)
• PED declaration rate (honesty proxy — too low means bad UX or bad incentives)
• Add-on attach rate & plan-tier mix (revenue quality)
• Nominee skip rate — currently ~41% in this demo's lore; that's a data-quality debt you'll pay at claims time

Pair every growth metric with a guardrail (e.g. conversion ↑ must not push misdeclaration ↑).`
  },
  {
    match: /\b(hi|hello|hey|help|what can you do)\b/i,
    reply: `Hi! I'm Feasly's PM copilot. I can help with:

• Feasibility — ask "can we offer monthly EMI payments?" and I'll answer from the actual connected codebase, with file-and-line evidence
• PRD / spec skeletons
• Prioritization (RICE) and roadmap shaping
• Standup & stakeholder update templates
• Journey metrics worth instrumenting

Feasibility questions are my party trick — everything else is standard PM craft.`
  }
];

// Advisory questions about instalment defaults deserve a recommendation,
// not a feasibility verdict — checked BEFORE the grounded route so the
// verdict reply doesn't swallow them.
const DEFAULT_HANDLING = /\b(miss(ed|ing|es)?|default|fail(ed|ing|ure|s)?|laps(e|ed|ing))\b[^]{0,120}?\b(instalment|installment|emi)\b/i;
const defaultHandlingReply = `🧭 Default-handling recommendation, grounded in the gateway constraints on file:

The gateway retries a failed instalment webhook for ~72 hours, then gives up — it has no native default handling, so the product owns what happens next. Mandates are capped at ₹15,000/instalment with a webhook per collection.

Recommended rule (BRD-ready wording):
"Define default handling: two consecutive missed instalments pause the policy pending payment — new claims are blocked while paused, and cover auto-resumes once the missed instalment is paid."

Why this shape:
• One miss ≠ intent — the 72h retry window absorbs transient failures, so acting on the second consecutive miss avoids punishing a payment glitch.
• Pausing (not cancelling) bounds underwriting exposure without forcing re-underwriting on resume.
• Auto-resume keeps ops out of the loop and matches the per-instalment webhook model.

Add it to your BRD as a requirement and save a new version — every PDN, epic, story and test generated from the older version will be flagged for review automatically.`;

function chatReply(text) {
  if (DEFAULT_HANDLING.test(text)) return defaultHandlingReply;
  const grounded = feasibilityReply(text);
  if (grounded) return grounded;
  for (const intent of INTENTS) {
    if (intent.match.test(text)) return intent.reply;
  }
  return `I'm the demo copilot, so I run deterministic logic offline (a live Feasly tenant plugs in their own LLM key — set ANTHROPIC_API_KEY and this chat upgrades itself).

What I'm genuinely good at here:
• Feasibility questions — try "make nominee details mandatory" or "offer monthly EMI payments" and I'll answer from the connected Zenith codebase with evidence
• PRD skeletons, RICE prioritization, roadmap shaping, standup templates, journey metrics

Ask me one of those?`;
}

module.exports = { chatReply };
