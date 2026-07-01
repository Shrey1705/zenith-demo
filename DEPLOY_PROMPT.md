# Prompt for Claude Code — deploy elevate-demo to Vercel

Copy everything below the line into Claude Code, run from the `elevate-demo` directory.

---

I have a working monorepo in this directory: an insurance issuance demo I want to host on Vercel as a single public URL for my resume. Read README.md first for architecture and demo flows.

Current structure:
- `core-service/` — Express :4001. Proposal lifecycle APIs (create/update/submit/form/payment-link/confirm), premium engine reading YAML rules from `core-service/src/rules/`, in-memory store in `src/store/memoryStore.js` (deliberately DB-shaped 6-function interface).
- `ai-service/` — Express :4002. Login + `/analyze`: scans actual source files of both codebases via `fs.readFileSync` relative to repo root (see `ai-service/src/analyzer.js`) and returns feasibility verdicts with file+line evidence.
- `journey-app/` — React/Vite SPA with react-router routes `/`, `/buy`, `/agent`, `/pay/:token`, `/ai`. Calls backends via Vite proxy paths `/core/*` and `/ai/*` (see `src/lib/api.js`).

Goal: one Vercel project, one URL, all three flows working: (1) customer buy journey ending in payment + issuance, (2) agent journey → payment link opened in another tab → agent screen auto-flips to ISSUED via status polling, (3) AI portal login → analyze → PDN/stories/test cases with code evidence.

Requirements:

1. **Restructure for Vercel**: convert both Express services to Vercel serverless functions under `/api` (e.g. `api/core/[...path].js` and `api/ai/[...path].js`, reusing the existing service/route modules — do not rewrite business logic). Update `journey-app/src/lib/api.js` base paths accordingly. Add `vercel.json` with SPA rewrites so deep links like `/pay/:token` and `/ai` work on refresh.

2. **Fix state for serverless**: the in-memory store won't survive across invocations, which breaks the agent payment-link flow (poll hits a different instance). Implement the existing 6-function store interface against Upstash Redis (Vercel Marketplace integration, free tier) using env vars, with automatic fallback to the in-memory store when the env vars are absent so `npm run dev` still works locally with zero setup. Walk me through connecting Upstash via the Vercel dashboard when we get there.

3. **Fix the AI code scanner for serverless**: `analyzer.js` reads repo source files from disk; bundled functions won't have them at the same relative paths. Either use `includeFiles` in vercel.json / function config to bundle `core-service/src/**` and `journey-app/src/**`, or generate a build-time snapshot module of the scanned files. Keep the line-number evidence working, and keep local dev working.

4. **Demo polish for a public URL**: add a small dismissible banner ("Portfolio demo by Shrey Sagar — simulated payments, data resets periodically" with a link to the GitHub repo). Make sure demo credentials (agent/agent@123, pm/elevate@123) are shown on the login screens. Add basic rate limiting or input length caps on the API functions so a public demo can't be trivially abused.

5. **Deploy**: initialize a git repo if needed with sensible commits, then use the Vercel CLI (`vercel`) — prompt me to log in when required. Deploy to production, then verify by hitting the live URL: run through all three flows via curl where possible (create proposal → submit → payment link → confirm → ISSUED; AI login → analyze "Offer monthly premium payment EMI" → expect Red/XL with evidence from premium.rules.yaml). Fix anything broken and redeploy.

6. **Finish**: update README.md with the live URL at the top, and give me: the production URL, what changed and why (one paragraph), and the exact text/link I should put on my resume.

Constraints: don't change the premium math, business rules, journey UX, or the AI portal's outputs. Local `npm run dev` must keep working exactly as before. If any step needs a paid service, stop and give me a free alternative instead.
