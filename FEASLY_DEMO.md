# Feasly — Interview Run-of-Show

The EMI feature is built **live, from a blank project**, in front of the interviewer.
Nothing about EMI is pre-seeded. Every AI answer is deterministic and grounded in the
connected codebase, so nothing can hallucinate on stage.

---

## The story you are telling (30 seconds, before touching the screen)

> "Today my AI workflow is a chat window and a Word document. I prompt a copilot,
> copy the output into Word, prompt again, copy again. Two problems: the AI runs out
> of context and starts inventing things, and none of the documents know about each
> other — when a requirement changes, nothing downstream knows it's outdated.
>
> Feasly fixes both. Every answer is grounded in the actual codebase with
> file-and-line evidence — it isn't allowed to guess. And every output is a *document
> in a knowledge graph*, not chat scrollback — so when a BRD changes, Feasly knows
> exactly which PDNs, stories and test cases just went stale.
>
> Let me build a real feature in it, from an empty project, right now."

---

## Pre-demo checklist (2 minutes before)

1. Open **zenith-health-demo.vercel.app/ai** (or localhost) → login is prefilled → click **Login**.
2. On Home, click **↺ Reset demo data** (bottom) if you've rehearsed in this browser.
3. Confirm Home shows two projects: *High-Value Cover Expansion* (the mature fallback) and *Nominee & KYC Enhancements*. **No EMI project** — that's the point.
4. Keep this file open on a second screen for the prompts (or memorise them).
5. Fallback plan: if anything misbehaves, open **High-Value Cover Expansion** — it's the same workflow, fully built — and narrate it instead.

---

## Run of show (~7 minutes)

### Act 1 — A question, not a document (90 seconds)

**Click:** Home → type `EMI & Payment Flexibility` in *New project…* → **Create**.
You land in an empty Research workspace.

**Say:** "Every feature starts as a question. In my old workflow this question goes into a chat and the answer dies there. Here, research is a first-class document."

**Type into the Ask bar (Prompt 1):**

```
Task: assess whether Zenith can offer monthly EMI premium payments today.
Scope: rating rules, payment lifecycle, proposal API contract.
Constraints: cite file-and-line evidence for every claim; if something cannot be verified in code, flag it — do not guess.
Output: current constraint, impacted systems, severity.
```

**Point at the answer:** red verdict, effort points, and evidence lines like `premium.rules.yaml:6 — payment_frequency_options: [ANNUAL]`.

**Say:** "Notice the prompt structure — task, scope, constraints, output format — and notice the answer: it cites the exact file and line. It's reading the connected repo, not remembering an old conversation. And the constraint says *flag what you can't verify* — that's the anti-hallucination contract."

**Click:** **Save as research document.** → you land on the saved doc. Click **← Research**.

**Click:** **🔌 Import API docs** → a gateway-capabilities document appears (recurring mandates, ₹15k ceiling, 72-hour webhook retry, *no native default handling*).

**Say:** "Uploads, Confluence pages, API docs — they all land in the same knowledge base. Two research documents in under two minutes, and neither will ever scroll away."

### Act 2 — The BRD, written from knowledge (90 seconds)

**Click:** Sidebar → **BRDs** → type `Offer monthly premium payment (EMI)` → **Create**.

**Type these three requirements** (add each with Enter):

1. `Offer a monthly EMI payment option alongside annual at quote and checkout`
2. `Compute an interest-free instalment schedule from the annual premium`
3. `Reflect the selected payment plan on the review screen and proposal PDF`

**Fill:** Stakeholders: `Underwriting, Payments, D2C Journey PM`
**Tick** both research documents under *Research in context*.

**Click:** **✦ Check completeness** (right rail).

**Say:** "The AI reviews my BRD like a colleague would — and it catches that I haven't written success criteria."

**Fill success criteria:** `EMI adoption ≥20% of new policies in the first quarter; no rise in payment-default rate`

**Click:** in the Versions rail, type `Initial draft from EMI research` → **Save as v1**.

### Act 3 — One click to the whole delivery chain (90 seconds)

**Click:** **⚡ Generate PDN** (right rail). ~1 second later you're on the PDN.

**Say:** "This wasn't a template. It re-analysed my requirements against the codebase — see the impact table with file-and-line evidence, and the trace rail: this PDN knows it came from BRD v1 and those two research documents."

**Click:** **⚡ Generate delivery chain** (right rail).

**Point at the sidebar:** Epics 2 · User Stories 5 · Functional Reqs 9 · Test Cases 10 — all appeared in one click.

**Click:** Sidebar → **Test Cases** → open any one → **walk the Upstream rail out loud:**

> "Test case → functional requirement → user story → epic → PDN → BRD v1 → the churn research. In Word, this chain lives in my head. Here it's structural."

**Click:** Sidebar → **Knowledge Graph** → click the BRD node.

**Say:** "This is the project as knowledge, not folders. One click and I see everything this BRD created."

### Act 4 — The change. The mind-blow. (2 minutes)

**Say:** "Now the thing that breaks every chat-plus-Word workflow: the requirement changes."

**Click:** Sidebar → **Conversations** → **+ New conversation**.

**Type (Prompt 2):**

```
Context: our payment gateway retries a failed instalment webhook for 72 hours and has no native default handling; mandates are capped at ₹15,000 per instalment.
Task: recommend a default-handling rule for missed EMI instalments on a health policy that bounds underwriting risk without cancelling cover.
Output: one BRD-ready requirement sentence plus a 3-line rationale.
```

**Point:** the answer recommends *two consecutive missed instalments pause the policy*, with BRD-ready wording — grounded in the gateway constraints from the research. **Click Save to Research** on the reply. *(Optional: back in the BRD, tick this new research doc into context too.)*

**Click:** **BRDs** → open the EMI BRD → **add requirement 4:**

`Define default handling: two consecutive missed instalments pause the policy pending payment`

**Click:** Versions rail → note: `Added default handling after underwriting review` → **Save as v2**.

**Click:** Sidebar → **Test Cases**.

**Say (this is the moment):** "I changed one sentence in the BRD. Look — every single test case is now flagged *upstream changed*. Nobody had to remember. Nobody had to email QA. The workspace knows, structurally, that these were generated from v1 and the BRD is now at v2."

**Click:** **PDNs** → open the PDN → the amber banner reads *generated from v1, BRD is now at v2* → **click Regenerate from v2.**

**Point:** staleness clears everywhere (0/13 flagged) — and the chain **grew**: User Stories 5→6, Functional Reqs 9→12, Test Cases 10→13. The new story *"Handle missed instalments and pause the policy"* arrived with its own FRs and DFLT test cases (pause after two misses, paused policy blocks claims, auto-resume).

**Say:** "It re-grounded the PDN against the current BRD and generated exactly the artifacts the new requirement demanded — down to Gherkin test cases. One sentence in, full traceable coverage out."

**Click:** **Knowledge Graph** one last time — the web is visibly bigger.

### Close (20 seconds)

**Click:** **Settings → Connected Systems.**

> "That's why it can't hallucinate: read-only connectors to the actual repos, every claim carries file-and-line evidence, and everything the AI produces becomes a versioned, linked document instead of context-window residue. This is my answer to the copy-paste-into-Word workflow."

---

## 3-minute short version

1. Create project → Prompt 1 in Research → Save as document (60s)
2. BRD with 3 requirements + link research → Save v1 → Generate PDN → Generate chain (60s)
3. Add requirement 4 → Save v2 → show Test Cases all flagged → Regenerate → new DFLT tests appear → Graph (60s)

## If asked "is the AI real?"

> "The workspace is fully real — persistence, versioning, traceability, staleness, the graph. The AI layer is deliberately deterministic for the demo: it keyword-routes to a knowledge map and verifies every claim against the actual source files, which is exactly the grounding architecture I'd productionise — swap the router for an LLM with retrieval over the same code index, keep the evidence contract. There's literally an `ANTHROPIC_API_KEY` switch in the backend that upgrades the chat to a live model."

## Q&A ammo

- **How does staleness work?** Computed, never stored: the PDN records the BRD version it was generated from; anything under a stale PDN inherits it. No bookkeeping to drift.
- **Why documents instead of chat?** Context windows forget; documents version. Research → BRD → PDN → …chain is a DAG with typed edges, so impact analysis is a graph walk, not a memory.
- **What would production look like?** Same IA; swap localStorage for Postgres, the deterministic router for retrieval-augmented LLM calls over a code index, keep the evidence-or-flag contract, add SSO + Jira/Confluence write-back.
