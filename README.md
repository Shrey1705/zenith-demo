# Zenith — Health Insurance Issuance Demo + AI Feasibility Portal

**Live demo:** [zenith-health-demo.vercel.app](https://zenith-health-demo.vercel.app) · [source on GitHub](https://github.com/Shrey1705/zenith-demo)

A portfolio prototype by **Shrey Sagar** that models how enterprise insurance is actually built — a core policy-admin system holding the business rules, a frontend journey application consuming its APIs — and then layers a PM-facing **AI feasibility portal** on top that reads both codebases to answer the question every PM runs to Tech for: *"is this change feasible, and what does it touch?"*

> This is an independent educational prototype modeling how a modern health insurer's issuance journey works end-to-end — not modeled on, affiliated with, or using any assets of any specific insurer.

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
| AI portal (`/ai`) | `pm` / `zenith@123` |

## Demo script (5 minutes)

1. **Buy a policy** (`/buy`, 3 steps) — *Get a quote*: pick members (counters for kids), type DOBs as `dd/mm/yyyy` (slashes auto-fill, age appears live), pincode 400001, answer the medical-history toggle (say Yes on Self and watch the questionnaire unfold + PED loading appear in the live premium panel), flip SI to ₹25L and tenure to 3yr (savings badges are computed from core rules), add add-ons with plain-English explainers → *Your details*: mobile + simulated OTP, proposer fields, skip or fill nominee → *Review & pay*: proposal form served by core's `/form` API, **download the auto-filled proposal PDF**, then pay on the simulated gateway → **instant policy issuance**.
2. **The handoff** — the success screen pivots you straight into the AI portal, auto-logged-in ("that was the easy part").
3. **AI portal** — click *"Offer monthly premium payment (EMI)"* → Red verdict, 13 story points: the analyzer shows `payment_frequency_options: [ANNUAL]` straight from `premium.rules.yaml` with line numbers → open the PDN tab (sign-off checklist included), Stories tab, Test cases tab (Gherkin). Then try *"Make nominee details mandatory"* — Amber, and it flags the breaking-change risk for other v2 consumers plus the conversion risk of removing the skip.

(An agent flow — same journey on behalf of a customer with a payment link and live status polling — still lives at `/agent`, login `agent / agent@123`.)

## Product decisions worth asking me about

**Why traffic-light verdicts keyed to layers?** In enterprise insurance the expensive question isn't "how much code" — it's *"does this ride the core release train?"* Red = core rules/DB (UW/actuarial sign-off, migrations), Amber = API contract (versioning + consumer coordination), Green = journey-only. That's the mental model PMs and architects already share; the tool just computes it.

**Why does every impact carry code evidence?** A wrong Green is worse than no answer. The analyzer verifies each claimed impact against the actual source and shows file+line; anything unverifiable is downgraded to "verify manually" instead of asserted. The PDN reports its own evidence coverage.

**Why is the AI portal deterministic in this prototype?** The demo must run offline and never hallucinate a dependency. The production design (documented here deliberately): read-only repo connectors → static-analysis dependency graph (contracts, rule files, schema constraints) → LLM maps natural-language change requests onto the graph and drafts the PDN. *LLM proposes, graph constrains.*

**Why in-memory store instead of MongoDB?** The store exposes a six-function DB-shaped interface (`schema.sql` documents the real DDL). Mongo would add setup friction to a demo while demonstrating nothing about the product. Scope discipline is a feature. In production the same six functions run against Upstash Redis (serverless invocations don't share process memory, so state has to live somewhere); locally, with no Redis env vars set, it falls straight back to the in-memory version — zero setup either way.

**Deliberately planted tech debt** — the relationship enum is duplicated between core rules and journey validation, the v2 contract omits per-member PED waiting period (there's a `TODO(PROD-2311)` on the review screen), and nominee is optional with a measured 41% skip rate. The AI portal finds and reports all three. Real systems have scar tissue; the tool's job is knowing where it is.

## What the AI portal outputs

For a matched change request: feasibility report (per-component verdict + evidence lines), PDN draft (impacted systems, business rules, API impact, sequencing, risks, open questions, sign-offs), Jira-ready stories per layer with acceptance criteria, and Gherkin test cases including cross-system E2E (D2C vs agent premium parity, payment-link single-use, DRAFT→SUBMITTED→ISSUED).

## Limitations (honest ones)

Payment gateway is simulated; auth is demo-grade (SSO in production); the entity-impact map is hand-built for five change families — the production path replaces it with the static-analysis graph above; premium rates are illustrative, not actuarial.

## Deploying

`vercel deploy --prod` (after `vercel pull` + `vercel build --prod`). One gotcha: the public URL `zenith-health-demo.vercel.app` is a manually-set alias and does **not** follow new production deployments automatically — re-point it after every deploy:

```bash
npx vercel alias set <new-deployment-url> zenith-health-demo.vercel.app
```
