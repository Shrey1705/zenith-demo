# ADR-0001 — What Zenith Is, and the Smallest Thing That Gets Us Four Customers

_This document is written in Zenith's own decision format. It is the first entry in Zenith's organizational memory. If the philosophy below is right, this file should still be answering "why did we decide this?" a year from now._

- **Status:** Proposed → for founder ratification
- **Decision owner:** Shrey (founder)
- **Date:** 2026-07-17
- **Review date:** 2026-08-24 (the Sprint-3 outreach checkpoint — revisit with real customer evidence)
- **Confidence:** Medium-high on the wedge; deliberately low on the platform
- **Supersedes:** the "Decision Intelligence Platform" framing in the Sprint-004 brief

---

## 0. The challenge (read this first)

You asked me not to preserve your ideas because they're yours. Here is where I disagree with the brief.

**The hypothesis — "no true System of Record for Decisions exists, and Zenith becomes it" — is directionally true and strategically dangerous as a starting position.** Three reasons it's dangerous, each fatal on its own:

1. **Systems of record are never bought as systems of record.** Nobody adopted GitHub to "have a system of record for code" — they adopted a tool to collaborate on code they had to write anyway, and the record accrued for free. Linear didn't sell "a record of your work"; it sold fast, opinionated issue tracking. **The record is always a byproduct of a daily-use productivity tool.** If you position Zenith *as* the record, you're selling the second-order benefit and skipping the reason anyone opens the app on a Tuesday.

2. **A system of record is worthless when empty.** On day one Zenith's decision history is a blank page — zero retrieval value, zero "why did we decide X" answers, nothing to pay for. Every decision-log / decision-journal product in the graveyard died here: the value is realized months later, the cost is paid now, so the record never gets maintained. **The MVP must deliver its full value on the *first* decision, before any accumulation.**

3. **It sells to the wrong wallet on the wrong clock.** "System of record for org decisions" is bought by a CPO/CTO for the whole company — a 6–9 month committee sale with security review. You have ~9 weeks and need four credit cards. The governance apparatus in this brief (escalation matrix, 11 roles, digital sign-offs, approval engine) is *exactly* the enterprise-committee software that lengthens that cycle. It is the right Year-2 expansion and the wrong Q3-2026 wedge.

**The reframe that resolves all three:** Sell the acute job a single PM will pay for out of pocket *this quarter*. Let the record accrue as a byproduct. The organizational-memory moat is real — but it is a *consequence* of doing the wedge well, not a thing you build first. You earn the category by having customers, then name it.

Everything below follows from that reframe.

---

## 1. Product Philosophy

**One sentence:** Zenith reduces the cognitive effort of making a defensible product decision to near zero — and makes the record of that decision a free byproduct that pays you back later.

Two laws, both learned from the graveyard:

- **The Byproduct Law.** Any artifact that requires extra work to capture will not be captured. The decision record must fall out of work the PM was already doing in Zenith (writing the spec, generating the chain), not be a second form they fill in.
- **The Payback Law.** The person who records a decision must personally benefit *before* the org does. A review-date reminder that resurfaces "you decided EMI was low-priority in July — here's the adoption data now" is what makes the record worth maintaining. Deferred, altruistic value ("someone will thank you in a year") is not enough.

The five gates from the brief are correct; I'd add a sixth that filters the whole platform vision:

1. Does it improve decision quality?
2. Does it cut context-gathering time?
3. Does it increase organizational learning?
4. Does it shorten time-to-market?
5. Would a customer pay for it?
6. **Does its value survive an empty workspace on day one?** (This gate kills most of the platform features as MVP candidates.)

**Anti-goals:** feature count; "connect all your tools"; governance-before-usage; declaring a category before earning it.

---

## 2. Product Category

- **What we build toward (10-year):** the organizational memory layer — the System of Record for *why*, sitting above the systems of record for *what* (code, tickets, docs, analytics).
- **What we sell today (the wedge):** "The AI workspace that turns a product question into a defensible, tracked decision — grounded in your own data, on your own machine." A PM understands that sentence in five seconds and knows if they need it. "Decision Intelligence Platform" is an analyst's phrase; no PM googles it.

Category is a trailing indicator of traction. Notion never announced "we're inventing the connected-workspace category" — they shipped a tool people used, and the category got named around them. Do that.

---

## 3. Core Domain Model

The insight that shrinks the whole roadmap: **80% of this model already exists in the codebase.** We have Products → Projects → Research → BRD → PDN → Epic → Story → FR → Test → Release, with traceability and computed staleness. We do **not** need to build a domain model. We need to add **one** first-class object at the top of the existing chain and let everything hang off it.

**The `Decision` becomes the spine.** It sits above a BRD and links down through the chain that already exists:

```
Decision ──▶ (produces) ──▶ BRD ──▶ PDN ──▶ Epic ──▶ Story ──▶ FR ──▶ Test ──▶ Release
   │
   ├─ context, alternatives-considered, chosen-option
   ├─ evidence[]  (links to Research notes, analytics, interviews, tickets)
   ├─ assumptions[]  (each with a confidence dial)
   ├─ owner, optional approver, status
   ├─ confidence (0–1), business/tech/customer impact (one line each)
   └─ review_date → measured_outcome → lessons_learned   ← the loop that creates the moat
```

Everything else in the brief's entity list (Organization, Team, Experiment, Metric, Postmortem, Approval-as-object…) is either already representable, or Year-2. The MVP adds exactly one table.

---

## 4. Organizational Memory Architecture

**Reject the boil-the-ocean version.** "Ingest GitHub + Jira + Confluence + Notion + Amplitude + CRM + email + transcripts and auto-connect everything" is a multi-year integration-maintenance treadmill that delivers an empty, low-precision graph on day one. It fails gate 6.

**MVP version — memory that starts full and grows narrow-but-clean:**

- Everything *created in Zenith* is already linked and versioned (we built this). That's the seed corpus — it's non-empty from the first spec.
- The **n8n Inbox** (already shipped) is the ingestion story: Gmail label → research note, WhatsApp → note, meeting transcript → note. One inbound webhook, not fifteen bespoke integrations. This is the honest version of "connect everything" — pull-based, user-curated, zero maintenance burden on us.
- Attribution and versioning already exist on every artifact (`createdAt`, source labels, BRD versions, computed staleness).

Memory is a consequence of the Byproduct Law, not a separate subsystem to build.

---

## 5. Knowledge Graph Architecture

**Do we need one? Yes — eventually. Not on day one.** A full versioned, confidence-scored, conflict-resolving knowledge graph is a research project; building it before you have customers is the classic pre-PMF over-engineering that kills startups.

- **Now:** typed links between artifacts (we have parent/child traceability + a Graph page already). That is a graph in the only sense that matters at MVP scale.
- **Trigger to build the real thing:** when a single customer's workspace exceeds ~200 decisions and retrieval precision on "what did we decide about X and why" measurably degrades. Not before.

**When built, entities:** Decision, Evidence, Assumption, Artifact, Person, Outcome. **Relationships:** `supports / contradicts / supersedes / depends-on / produced-by / owned-by / measured-by`. **Versioning:** append-only; a decision is never edited, it's superseded (preserves the "why then vs why now"). **Confidence:** propagates — a decision's confidence is a function of its evidence's confidence minus its contradicting evidence. **Conflict resolution:** surface, never auto-resolve; the platform's job is to show the human "these two pieces of evidence disagree," not to adjudicate.

**How this differs from RAG (this is the actual technical moat):** RAG retrieves *text chunks* by semantic similarity and hopes the LLM synthesizes correctly. A decision graph retrieves *structured claims with their evidence and confidence and contradictions*, so the AI reasons over "Decision D was made on evidence E1 (strong) and E2 (now stale), and Outcome O contradicts Assumption A2" — not over a bag of paragraphs. RAG answers "what does the doc say?"; the graph answers "what do we believe, how strongly, and what changed?" That difference is defensible. But it only pays off at accumulated scale — which is why it's a moat you grow into, not a feature you launch with.

---

## 6. Evidence Engine

- **MVP:** a Decision holds `evidence[]` — links to research notes, an uploaded chart, an interview, a support-ticket count. Each assumption gets a manual confidence dial (High/Medium/Low). When linked evidence changes or a linked artifact goes stale (staleness already computed), the assumption is flagged "evidence moved — revisit." That's 90% of the value for 10% of the build.
- **Deferred (with trigger):** *automatic* evidence accrual — analytics pipelines strengthening/weakening assumptions over time. Real, powerful, and requires the integrations + graph that only make sense post-customer. Build when the first customer asks "can it watch the metric for me?"

---

## 7. Decision Engine

The brief's field list is good but most fields are inert at MVP — a field only earns its place if it changes behavior. **MVP fields (each drives an action):** proposal, context, alternatives, chosen option, evidence links, assumptions+confidence, owner, status, one-line impact, **review_date**, and the post-review pair **outcome + lessons**. **Deferred fields:** approvers, dependencies matrix, separate business/tech/customer scoring — governance weight the wedge doesn't need.

The engine is not new infrastructure; it's the existing artifact-generation chain with a Decision object on top and a review-date scheduler (which the n8n scheduled-playbook endpoint already demonstrates).

---

## 8. Customer Simulation Engine

**Already built and shipping** (`sim/`, 7 weighted personas, `npm run sim`, interview-guide generator). It is genuinely ahead of the brief. Extensions from the brief worth adding — later, cheaply: political-constraints and authority fields on personas, and an "expected ROI / objections" section in the output. Do this in an afternoon when prepping for real interviews, not now. **It remains a QA/rehearsal gate, not a launch oracle** — that framing was right and stays.

---

## 9. Launch Readiness Engine

**Also mostly built.** The Definition-of-Done on the Releases pipeline (all stories Done + tests exist + no upstream drift + date set) *is* launch readiness v0, and the computed lifecycle stage is a second signal. **MVP methodology:** a 0–100 score = weighted mean of four computed sub-scores — Product (DoD checks passing), Evidence (decisions in the release have outcomes/confidence above threshold), Traceability (no stale artifacts), Coverage (tests per story). All computed from data we already hold; zero manual input. The brief's Customer/Operational/Documentation readiness axes are additive later; don't gate MVP on them.

---

## 10. Team Collaboration Model

Products → Projects exist. Real-time multi-user shared workspaces (server-authoritative, not the current per-user localStorage+sync) are the single genuinely-new piece of infrastructure the *team* story needs — and it's a Team-plan feature, worth building **only when a B2B pilot asks for it with a card in hand.** Until then, founder invites + per-user workspaces + the RBAC preview (all shipped) are enough to *sell* the team story and demo it.

---

## 11. Role & Permission Model

We shipped admin/editor/viewer with gating. **The 11-role hierarchy (Director/VP/EM/QA/Stakeholder/…) is enterprise-org-chart software.** It signals "we're built for big companies" — which lengthens the sale and clutters the UI a solo PM sees. **Reject for MVP.** Three roles cover every pilot. Add role granularity the day an enterprise deal requires it and pays for it.

---

## 12. Decision Governance Model

Owner + Status (Waiting → Under Review → Approved → Implemented → Validated → Archived) on the Decision object: **keep**, it's cheap and it's what makes a decision feel real. Reviewers/Approvers/Observers as distinct roles with routing: **defer.**

---

## 13. Escalation & Approval Architecture

A configurable policy engine that auto-computes required approvers by risk class is a beautiful enterprise feature and a **direct violation of gate 6** — it has zero value in an empty single-user workspace, and negative value in a demo (it reads as bureaucracy). **Reject for MVP. Trigger to build:** a compliance-driven B2B pilot (insurance/fintech) explicitly requires sign-off routing. That's a real future — the local-first + regulated-industry angle points right at it — but it's a Year-2 expansion sold to a buyer who wants governance, not the wedge sold to a PM who wants speed.

---

## 14. Data Model (concrete, MVP)

One new entity added to the existing `workspace.js` schema, per project:

```js
decision: {
  id, title, status,               // waiting|review|approved|implemented|validated|archived
  context, alternatives: [{ option, why_not }], chosen,
  evidenceIds: [],                 // → research notes / uploads / inbox items (existing)
  assumptions: [{ text, confidence }],   // high|medium|low
  confidence,                      // 0–1, derived + adjustable
  impact: { business, technical, customer },  // one line each
  ownerId, approverId,             // → team members (existing ws.team)
  brdId,                           // → the spec this decision produced (existing chain)
  reviewDate,
  outcome, lessons,                // filled after reviewDate; empty until then
  createdAt, versions: []          // append-only, supersede-not-edit
}
```

Everything it references already exists. Storage: the existing per-user Redis-synced workspace document — no new infra.

---

## 15. Repository Structure

No restructure needed. Additions only: `journey-app/src/ai/DecisionsPage.jsx` + `decision.js` (helpers, mirroring `playbooks.js`), a `/decisions` route, and a Decisions node in the project nav — exactly the pattern used for Playbooks and the Board. `ADR-*.md` files at repo root become Zenith's own dogfooded decision log.

## 16. API Architecture

Existing endpoints stand. Add: server-side review-date scheduler reusing the n8n scheduled-playbook pattern (`GET /playbooks/decision-review` → returns decisions past review date → n8n emails/WhatsApps the owner). This is the Payback Law made real, and it reuses shipped infrastructure.

---

## 17. MVP Definition — the smallest thing that gets four customers

**One loop, built on what exists:**

> A PM is asked "can we do X?" → opens Zenith → the AI feasibility + spec chain (built) turns the question into a grounded BRD → the PM records it as a **Decision** with alternatives, evidence links, a confidence dial, and a **review date** → the decision links to the spec/stories/tests it produced (built) → on the review date, Zenith resurfaces it via Gmail/WhatsApp: "you decided X in July at 60% confidence — revisit?" → the PM adds the outcome + lesson → **that becomes the first node of institutional memory, and it just saved them the next time.**

Scope to build (≈2 weeks, because 80% is done): the `Decision` object + `DecisionsPage` + the review-date resurfacing loop + linking decisions to the existing chain. **Nothing else.** Ship the local-first privacy story and founder invites (both done) as the distribution wedge.

Price it at the founding tiers already live ($19/mo, $99 lifetime, $49/mo team).

---

## 18. Roadmap to 2026-09-22

- **Now → Jul 27:** Build the Decision object + review loop (the MVP above). Dogfood it: every strategy call this quarter becomes a Zenith decision. Re-run `npm run sim` — the score delta validates whether the loop moved the needle.
- **Jul 28 → Aug 10:** Polish the one loop until the demo is undeniable. Wire the Stripe payment links (founder action). Record a 90-second "question → tracked decision → it comes back and pays off" video.
- **Aug 11 → Aug 24:** **Stop building.** 15–20 real PM conversations using the shipped interview guides. Sell the loop, not the platform. Kill-criterion checkpoint (this ADR's review date): if zero pilots, the wedge is wrong — revisit here, not in code.
- **Aug 25 → Sep 22:** Convert pilots → paid. Build *only* what a paying customer blocks on. First enterprise/governance request becomes the trigger to open the Year-2 platform — with a customer funding it.

---

## Final Questions — answered explicitly

**1. What category of software is Zenith?**
Today: an AI decision-and-delivery workspace for product managers (a daily-use productivity tool). Long-term: the organizational memory / System of Record for *why* — the layer above code/tickets/docs that remembers decisions, evidence, and outcomes. You build toward the second by selling the first. You do not lead with the category; you earn it.

**2. What is the smallest MVP that could acquire four paying customers?**
The single loop in §17: question → grounded spec (built) → recorded Decision with evidence + confidence + review date → linked to the delivery chain (built) → resurfaced on the review date with the outcome loop. One new object on top of an 80%-built workspace. ~2 weeks, not the platform.

**3. Which ideas should be removed because they're unnecessary for the MVP?**
The escalation/approval policy engine; the 11-role hierarchy (keep 3); digital sign-off routing (keep owner+status); the boil-the-ocean multi-integration ingestion (keep the n8n inbox); the full versioned/confidence-scored knowledge graph (keep typed links); automatic evidence accrual (keep manual evidence links); real-time shared team workspaces; separate business/tech/customer scoring engines. Every one of these fails gate 6 (no value in an empty day-one workspace) and lengthens the sale. All are legitimate Year-2 features — each gated behind a customer-funded trigger, not a calendar date.

**4. Which capabilities become Zenith's long-term moat?**
Not the graph tech (commoditizing). Three compounding things, in order: **(a)** the closed decision→outcome→lesson loop — organizational *learning* as an asset no competitor can copy because it's your history; **(b)** accumulated proprietary decision memory per org, whose switching cost compounds like GitHub's — but only if maintained, which the Byproduct + Payback Laws ensure; **(c)** local-first / privacy as the distribution wedge into regulated industries nobody else can serve. The moat is a *consequence* of the wedge done well, not a separate thing to build.

**5. If Zenith succeeds over ten years, what will customers say they can't imagine working without?**
"Our institutional memory of *why* we decided everything — and what actually happened. New hires onboard in days by reading the decision graph instead of interrogating whoever's left. When someone asks 'why did we build it this way,' the answer is one query, with the evidence and the confidence we had at the time — and whether we turned out to be right." That is the thing that has no substitute. Everything in this ADR is in service of earning the right to build it.
