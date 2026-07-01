# Elevate-style Health Insurance Demo + AI Feasibility Portal

A portfolio prototype by **Shrey Sagar** that models how enterprise insurance is actually built — a core policy-admin system holding the business rules, a frontend journey application consuming its APIs — and then layers a PM-facing **AI feasibility portal** on top that reads both codebases to answer the question every PM runs to Tech for: *"is this change feasible, and what does it touch?"*

> Journey design inspired by ICICI Lombard's Elevate health product issuance flow (public site). This is an independent educational prototype — not affiliated with, endorsed by, or using any assets of ICICI Lombard.

## Architecture

```
┌────────────────────────  journey-app (React, :5173)  ───────────────────────┐
│  /buy   Customer D2C journey     /agent  Agent portal (login + on-behalf)   │
│  /pay/:token  Payment link page  /ai     AI feasibility portal (login)      │
└──────────────┬──────────────────────────────────────────────┬───────────────┘
               │ /v2 proposals · payments                     │ /analyze
┌──────────────▼──────────────────────────┐   ┌───────────────▼───────────────┐
│  core-policy-system (Express, :4001)    │   │  ai-service (Express, :4002)  │
│  underwriting.rules.yaml (UW rules)     │◄──┤  scans BOTH codebases on disk │
│  premium.rules.yaml (rating)            │   │  → feasibility verdicts with  │
│  proposal-v2 contract · schema.sql      │   │    line-level code evidence   │
│  proposal lifecycle: DRAFT→SUBMITTED    │   │  → PDN draft                  │
│  →ISSUED · payment links               │   │  → Jira stories → test cases  │
└─────────────────────────────────────────┘   └───────────────────────────────┘
```

## Run it

```bash
npm install            # root: installs concurrently
npm run install:all    # installs all three packages
npm run dev            # boots core (:4001), ai (:4002), web (:5173)
```

Open http://localhost:5173

| Portal | Login |
|---|---|
| Customer journey (`/buy`) | none |
| Agent portal (`/agent`) | `agent` / `agent@123` |
| AI portal (`/ai`) | `pm` / `elevate@123` |

## Demo script (5 minutes)

1. **Customer journey** — Buy → pick Self+Spouse+Son → DOBs, pincode 400001 → answer declarations (say Yes to diabetes on Self: watch PED loading appear) → quote: flip SI to ₹25L, tenure 3yr, toggle add-ons and watch the premium re-rate live from core → proposer details, skip or fill nominee → review the proposal form (served by core's `/form` API) → pay → **instant policy issuance**.
2. **Agent flow** — Agent login → New proposal → same journey on behalf of a customer → *Submit & create payment link* → copy the link, open in a new tab as the customer → pay → watch the agent screen flip to **Policy issued** on its own (status poll from core).
3. **AI portal** — PM login → click *"Offer monthly premium payment (EMI)"* → Red verdict, XL: the analyzer shows `payment_frequency_options: [ANNUAL]` straight from `premium.rules.yaml` with line numbers → open the PDN tab (sign-off checklist included), Stories tab, Test cases tab (Gherkin). Then try *"Make nominee details mandatory"* — Amber, and it flags the breaking-change risk for other v2 consumers plus the conversion risk of removing the skip.

## Product decisions worth asking me about

**Why traffic-light verdicts keyed to layers?** In enterprise insurance the expensive question isn't "how much code" — it's *"does this ride the core release train?"* Red = core rules/DB (UW/actuarial sign-off, migrations), Amber = API contract (versioning + consumer coordination), Green = journey-only. That's the mental model PMs and architects already share; the tool just computes it.

**Why does every impact carry code evidence?** A wrong Green is worse than no answer. The analyzer verifies each claimed impact against the actual source and shows file+line; anything unverifiable is downgraded to "verify manually" instead of asserted. The PDN reports its own evidence coverage.

**Why is the AI portal deterministic in this prototype?** The demo must run offline and never hallucinate a dependency. The production design (documented here deliberately): read-only repo connectors → static-analysis dependency graph (contracts, rule files, schema constraints) → LLM maps natural-language change requests onto the graph and drafts the PDN. *LLM proposes, graph constrains.*

**Why in-memory store instead of MongoDB?** The store exposes a six-function DB-shaped interface (`schema.sql` documents the real DDL). Mongo would add setup friction to a demo while demonstrating nothing about the product. Scope discipline is a feature.

**Deliberately planted tech debt** — the relationship enum is duplicated between core rules and journey validation, the v2 contract omits per-member PED waiting period (there's a `TODO(PROD-2311)` on the review screen), and nominee is optional with a measured 41% skip rate. The AI portal finds and reports all three. Real systems have scar tissue; the tool's job is knowing where it is.

## What the AI portal outputs

For a matched change request: feasibility report (per-component verdict + evidence lines), PDN draft (impacted systems, business rules, API impact, sequencing, risks, open questions, sign-offs), Jira-ready stories per layer with acceptance criteria, and Gherkin test cases including cross-system E2E (D2C vs agent premium parity, payment-link single-use, DRAFT→SUBMITTED→ISSUED).

## Limitations (honest ones)

Payment gateway is simulated; auth is demo-grade (SSO in production); the entity-impact map is hand-built for five change families — the production path replaces it with the static-analysis graph above; premium rates are illustrative, not actuarial.
