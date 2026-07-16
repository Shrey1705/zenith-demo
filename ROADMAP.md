# Feasly — Product Delivery Roadmap

**Deadline: 22 Sept 2026 — 4 paying customers.** Today: 16 July. **9.5 weeks.**
Companion doc: `ARCHITECTURE.md` (technical operating model).

---

## 1. The problem the MVP must solve

A PM's product knowledge is scattered (Notion, Slack, decks, their own head). When asked "why did we decide X?" or "what's the current spec?", they dig or guess. **Feasly keeps every artifact — research → BRD → stories → releases — in one traceable chain, with an AI that answers from those artifacts and runs on the PM's own machine (nothing leaves their laptop).**

If a feature doesn't serve "trustworthy answers from my own product artifacts," it is not MVP.

## 2. Two customer angles

| | B2C | B2B |
|---|---|---|
| **Who** | Individual PM, personal card | Product team lead / head of product, 3–10 seats |
| **Pain** | Drowning in their own docs; ChatGPT doesn't know their product; company forbids pasting docs into cloud AI | Team knowledge lives in people; onboarding new PMs takes months; compliance blocks cloud AI (esp. insurance/fintech/health) |
| **Pitch** | "Your AI chief-of-staff that runs on your laptop" | "Your team's product memory — private by architecture." Zenith insurance demo = the vertical proof for regulated industries |
| **Price** | Founding member: **$19/mo or $99 lifetime** (10 seats max) | Pilot: **$49/mo per team** flat during founding period |
| **Target** | 3 customers | 1 team pilot (counts as 1 customer) |

The local-first architecture is the moat for *both*: B2C gets free inference (no API bills), B2B gets compliance (data never leaves the machine).

## 3. MVP vs good-to-have

### MVP — must exist to charge money
| # | Feature | Status |
|---|---|---|
| M1 | Artifact chain with traceability (research→BRD→stories→releases) | ✅ shipped |
| M2 | Local RAG over user's own documents (Ollama) + Library | ✅ shipped |
| M3 | Products→Projects hierarchy + computed lifecycle stages | ✅ shipped |
| M4 | Playbooks — 6 guided PM workflows producing chain documents | 🔨 pending (#93–95) |
| M5 | **Real accounts**: magic-link auth, per-user persistence (Redis) — without this nobody can *use* it, only demo it | ✅ shipped 2026-07-16 (email delivery pends RESEND_API_KEY — founder action) |
| M6 | Onboarding: first-run flow from empty workspace → first artifact in <10 min (current app assumes seeded demo data) | ✅ shipped 2026-07-16 |
| M7 | Pricing page + Stripe Payment Link + license check | ✅ page shipped 2026-07-16 — paste Stripe links into `journey-app/src/lib/pricing.js` (founder action); license check deferred to first paying customer |
| M8 | Setup installer: one script that checks/installs Ollama + models (a paying customer can't debug `brew reinstall ollama`) | ✅ shipped 2026-07-16 (`setup-local-ai.command`) |

### Good-to-have — later builds, explicitly deferred
| Feature | Why deferred |
|---|---|
| API Explorer (Phase 4) | demo candy, doesn't serve the core answer-from-artifacts job |
| Knowledge Graph / Semantic Map polish | visual wow, not a buying reason |
| Model Hub / BYO-model UI beyond Ollama default | power-user feature; founding users get a default |
| Team collaboration (shared workspaces, comments) | B2B v2 — pilot team can share one workspace first |
| Mobile experience | PMs buy on desktop |
| Integrations (Jira/Notion import) | huge pull, huge effort — validate demand in interviews first, build the ONE most-requested importer post-first-customer |

**Trap to avoid:** M5–M8 are unglamorous compared to good-to-have list, but every week spent on graph polish instead of auth is a week the product stays unsellable.

## 4. Timeline

**Sprint 1 — Jul 16–27 · "Product complete"**
Playbooks #93–95 · sim engine v1 (personas, rubric, evaluate, report) · `interview-prep.js` interview guides · first build report, fix its blockers.
*Gate: sim report in hand; playbooks demoable.*

**Sprint 2 — Jul 28–Aug 10 · "Sellable"**
M5 auth + per-user store (the hard one, Claude-heavy) · M6 onboarding · M7 pricing + Stripe (Shrey creates the Payment Link) · M8 installer script.
*Gate: a stranger can sign up, use it, and pay without talking to us.*

**Sprint 3 — Aug 11–24 · "Market testing"** *(founder time, not code time)*
15–20 real PM conversations using the sim-generated interview guides · offer 2-week free pilot → founding price · B2B: 3 team-lead demos with the insurance vertical story · code time only for fixing what interviewees flag.
*Gate: ≥5 active pilots, ≥1 B2B demo done.*

**Sprint 4 — Aug 25–Sep 7 · "Convert"**
Pilot check-ins → convert to paid · conversation wave 2 with sharpened pitch · fix top-3 pilot complaints only.
*Gate: ≥2 paying customers.*

**Sprint 5 — Sep 8–22 · "Close + buffer"**
Close remaining conversions · harden (backup/export, error states) · buffer for the unknown-unknowns.
*Target: 4 paying customers (3 B2C + 1 B2B pilot).*

## 5. Checkpoints & kill criteria

- **Aug 10:** if M5–M8 aren't done, cut scope (e.g., lifetime-only pricing, manual license emails) — do NOT push interviews later; conversations are the critical path.
- **Aug 24:** if ~20 conversations produce zero pilots, the wedge is wrong — stop building, re-segment (candidates: insurance-vertical PM tooling; or selling the sim engine itself as "synthetic user testing").
- **Sep 7:** if pilots are active but nobody converts, it's a pricing/packaging problem, not product — try lifetime-only or concierge onboarding included.

## 6. Funnel math (why 20 conversations)

20 convos × ~25% pilot rate ≈ 5 pilots × ~50–60% founding-price conversion ≈ 3 customers, +1 B2B pilot from 3 team demos ≈ **4**. Every rate is a guess until Sprint 3 — the sim engine's interview guides exist to raise the pilot rate by making conversations sharper.
