# Sprint 005 — The Decision Object + Review Loop (the MVP from ADR-0001)

**Goal:** ship the one loop that makes Zenith sellable this quarter, on top of the ~80%-built workspace. No new infrastructure — one new first-class object and one reused scheduler pattern.

**The loop:** question → grounded spec (built) → recorded **Decision** (new) with alternatives / evidence links / confidence / review date → linked to the delivery chain (built) → **resurfaces on the review date** → capture outcome + lesson → first node of organizational memory.

**Scope discipline:** everything the ADR marked "deferred / gated behind a customer trigger" stays out. If a task isn't in a phase below, it's not in this sprint.

---

## Domain decision (how Decision fits the existing model)

The `Decision` sits **above** the BRD, mirroring how `research` already links into a BRD via `researchIds`. We do **not** shoehorn it into the generic `TYPES`/`ArtifactPage` machinery (its shape is rich and distinct, like BRDs, which already have their own `BrdsPage`). Instead:

- New per-project array `decisions: []` (alongside `research`, `brds`, …).
- New field `decisionId` on a BRD = "the decision that produced this spec."
- Traceability extends the existing pattern: `upstreamOf` prepends a BRD's decision (exactly as it already prepends research); `childrenOf(decision)` returns BRDs where `brd.decisionId === decision.id`.

This is the minimal, consistent change — no rewrite of `parentOf`/`downstreamOf`/staleness.

### Data model (per project, in `workspace.js`)

```js
decision: {
  id, title, status,              // 'waiting'|'review'|'approved'|'implemented'|'validated'|'archived'
  context, chosen,
  alternatives: [{ option, whyNot }],
  evidenceIds: [],                // → research notes / inbox items (existing research docs)
  assumptions: [{ text, confidence }],   // 'high'|'medium'|'low'
  confidence,                     // 0–1, PM-set (derived-assist later)
  impact: { business, technical, customer },  // one line each, optional
  ownerId, approverId,            // → ws.team.members ids (existing)
  reviewDate,                     // ISO date
  outcome, lessons,               // '' until the review is done
  createdAt, versions: []         // append-only; supersede-not-edit
}
```

---

## Phase 5a — Store: entity, helpers, traceability, seed

`journey-app/src/ai/workspace.js`

- Add `decisions: []` to `emptyState()` project shape and to every seed project; add to `migrateState` (back-fill `decisions: []` + `decisionId: null` on existing BRDs so old workspaces don't break).
- Helpers: `addDecision`, `updateDecision` (append-only version bump on material edits), `removeDecision`, `findDecision(project, id)`.
- Traceability: in `upstreamOf`, when the chain top is a `brd`, prepend `{ type: 'decision', doc }` if `brd.decisionId` resolves (alongside existing research prepend). In `childrenOf`, add a `decision` case returning its BRDs.
- Review-loop selectors: `decisionsDueForReview(project, windowDays = 0)` → decisions with `reviewDate <= today+window && !outcome`; `dueDecisionCount(ws)` → workspace-wide count for the nav badge.
- Confidence helper `confidenceLabel(n)` for display.
- **Seed the showcase:** add one decision to `proj-si` — *"Open a ₹2 crore sum-insured band"* — with real alternatives, evidence linked to the two existing research notes (`r-hni`, `r-uwband`), assumptions with confidence, `status: 'implemented'`, `reviewDate` in the near past, and **empty outcome** (so the demo shows a decision *due for review*). Set `decisionId` on the existing `b-si` BRD to point back. This makes the loop visible with zero clicks.

## Phase 5b — DecisionsPage (list + rich editor + detail)

`journey-app/src/ai/DecisionsPage.jsx` (new; model it on `BrdsPage.jsx` structure — list view + detail view with `TraceRail`)

- **List:** decisions with status pill, confidence, owner, and a **"Due for review"** highlight for overdue ones. "New decision" (gated by `can(ws,'edit')`).
- **Editor:** title, context, chosen option, alternatives (add/remove `{option, whyNot}`), evidence picker (multi-select over the project's research notes — inbox items are research, so Gmail/WhatsApp-captured evidence appears here), assumptions with High/Med/Low dials, confidence slider, one-line impact ×3, owner/approver selects (from `ws.team.members`), status select, review date.
- **Detail:** renders the decision + a `TraceRail` showing downstream (the BRD/PDN/stories it produced) and a **"Draft the spec from this decision"** action → creates a BRD with `decisionId` set and context carried into `sections.background` (reuses existing BRD creation). If a linked BRD already exists, link straight to it.
- **Review capture:** when a decision is due (past `reviewDate`, no outcome), show an inline **"Record outcome"** panel — `outcome` + `lessons` fields; saving stamps them and flips status → `validated`.

## Phase 5c — The resurfacing loop (in-app + scheduled)

- **In-app:** a dismissible banner on the project (and a count badge on the Decisions nav item) — "N decision(s) are past their review date — close the loop." Reuses `decisionsDueForReview`.
- **Server:** `GET /playbooks/decision-review?window=7` in `ai-service/src/app.js` (auth via existing `authUser`), reading `accounts.getWs` and returning due decisions across all projects — mirrors the shipped `/playbooks/stakeholder-update` endpoint. Logic ported into `ai-service/src/playbookServer.js` (keep in step with the client selector).
- **n8n template:** `integrations/n8n/decision-review-to-whatsapp.json` (schedule → the endpoint → WhatsApp/Gmail: "You decided X in July at 60% confidence — revisit?"). This is the **Payback Law** made real, reusing the scheduled-playbook pattern already proven.

## Phase 5d — Wiring

`journey-app/src/ai/AiPortal.jsx`

- Route `p/:pid/decisions` → `DecisionsPage`.
- Add **Decisions** to `PROJECT_NAV` — new top group **"Decide"** above "Knowledge" (a decision precedes research in the real workflow), with the due-count badge.
- Lifecycle: leave `stageInfo` as-is for now (decisions don't change stage math); optional follow-up is to let a recorded decision satisfy an early "Define" signal — deferred unless it reads wrong in the demo.
- Gating already handled via `can(ws,'edit')` on the create/edit affordances.
- CSS in `styles.css`: decision cards, status pills, confidence dial, review-due highlight, outcome panel (reuse existing `.krow`, `.pbcard`, `.dodrow` idioms).

## Phase 5e — Verify, dogfood, ship

- **Browser E2E** (`preview_start zenith-dev`): open demo → SI project shows the seeded decision flagged *due for review* → open it → trace rail shows the BRD/stories it produced → click "Record outcome," add outcome+lesson → status flips to validated, banner clears. Then create a fresh decision, link evidence, set a past review date, confirm it surfaces.
- **Server:** `curl /api/ai/playbooks/decision-review` with a user token returns the due decision (401 without token).
- **Dogfood:** record ADR-0001 itself as a Decision in a Zenith workspace — the strategy call becomes the product's first real memory entry (screenshot-worthy for outreach).
- **Ship:** build, commit, push, `vercel deploy --prod`, **re-point the `zenith-health-demo.vercel.app` alias** (known gotcha), curl-verify prod endpoints.
- **Measure:** re-run `npm run sim` — compare the Overall Product Score against build `77fb743` (3.56, NOT-READY). The delta tells us whether the loop moved the needle before we spend Sprint-3 calendar on outreach.

---

## Out of scope (ADR triggers, not this sprint)

Approval/escalation engine · 11-role hierarchy · sign-off routing · auto evidence accrual · full knowledge graph · realtime shared workspaces · separate impact-scoring engines. Each waits for a customer-funded trigger.

## Estimate

~2 weeks equivalent; 5a–5b are the bulk (the new object + its page), 5c–5d reuse shipped patterns, 5e is verification. Build order: 5a → 5b → 5c → 5d → 5e.
