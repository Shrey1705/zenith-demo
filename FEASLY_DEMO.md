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

1. **Local (recommended — enables the live local-AI act):** double-click **Feasly.command** on the Desktop (or run `./start-feasly.command`). It boots Ollama + all three services and opens the browser. Otherwise open **zenith-health-demo.vercel.app/ai**.
2. Login is prefilled → click **Login**.
3. On Home, click **↺ Reset demo data** (bottom) if you've rehearsed in this browser.
4. Confirm Home shows two projects: *High-Value Cover Expansion* (the mature fallback) and *Nominee & KYC Enhancements*. **No EMI project** — that's the point.
5. Don't want to memorise the script? Click **🎬 Guided demo** (Home footer or the sidebar) — a step-by-step coach walks you through every act with one-click Copy buttons for all prompts. It survives navigation and reloads.
6. Fallback plan: if anything misbehaves, open **High-Value Cover Expansion** — it's the same workflow, fully built — and narrate it instead.

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

### Act 5 — Real AI, running on this Mac (2 minutes, local run only)

**Say:** "Everything so far was the deterministic demo brain — grounded and repeatable by design. Now let me swap in a real LLM. It's running on this laptop. No cloud."

**Click:** **Settings → Model Hub** → **↻ Detect Ollama** → it lists the models on this machine (llama3.2 + nomic-embed-text). **Point at the temperature slider:** locked low at 0.1 — *"factual, minimal hallucination"*. **Click Set active** on the Ollama card.

**Click:** **Research** → type into the Ask bar:

```
What happens when a customer misses an EMI instalment?
```

**Point:** the first ask builds a **vector index** — every document and code file in the project embedded locally. Then the answer arrives from llama3.2 with **"Grounded on:"** source chips (the story, the FRs, the DFLT tests it retrieved) and the engine label `llama3.2 @ Ollama · temp 0.1 · RAG`.

**Say:** "That's retrieval-augmented generation: retrieve by meaning, generate at temperature 0.1, and the system prompt forces it to cite or say *cannot verify* — never guess."

**Click:** Sidebar → **Semantic Map**.

**Say:** "And this is what the AI actually stores — not words, vectors. Each dot is a document or code chunk in 768 dimensions, projected to 2D. Watch: the BRD's nearest neighbors *by meaning* are its own PDN and the payment rules — nobody told it that." Click the BRD dot to show it. "Add a document, re-index, the constellation grows."

### Close (20 seconds)

**Click:** **Settings → Connected Systems.**

> "That's why it can't hallucinate: read-only connectors to the actual repos, every claim carries file-and-line evidence, and everything the AI produces becomes a versioned, linked document instead of context-window residue. This is my answer to the copy-paste-into-Word workflow."

---

## 3-minute short version

1. Create project → Prompt 1 in Research → Save as document (60s)
2. BRD with 3 requirements + link research → Save v1 → Generate PDN → Generate chain (60s)
3. Add requirement 4 → Save v2 → show Test Cases all flagged → Regenerate → new DFLT tests appear → Graph (60s)

## If asked "is the AI real?"

> "Both layers are real, and that's deliberate. The demo brain is deterministic — it keyword-routes to a knowledge map and verifies every claim against the actual source files, so the scripted part of the demo can never hallucinate on stage. And then I switch to a genuinely real LLM: llama3.2 running on this laptop through Ollama, with RAG I built — the workspace's documents and the connected code are chunked, embedded with nomic-embed-text into 768-dimensional vectors, retrieved by cosine similarity, and generated at temperature 0.1 under a cite-or-say-unverified system contract. Same grounding architecture, two engines."

## Running the local AI

- **One command:** double-click `Feasly.command` on the Desktop (or `./start-feasly.command`). It starts Ollama if needed, boots all services, waits, and opens the browser.
- **Models required once:** `ollama pull llama3.2` and `ollama pull nomic-embed-text`.
- **The deployed HTTPS page** (zenith-health-demo.vercel.app) can also reach your local Ollama, but the browser blocks it unless Ollama allows the origin: run `launchctl setenv OLLAMA_ORIGINS "https://zenith-health-demo.vercel.app"` and restart Ollama (or `OLLAMA_ORIGINS=… ollama serve`). On localhost no setup is needed — Ollama allows localhost origins by default.
- Everything degrades gracefully: with no Ollama detected, the Model Hub says so and the demo brain answers everything.

## Q&A ammo

- **How does staleness work?** Computed, never stored: the PDN records the BRD version it was generated from; anything under a stale PDN inherits it. No bookkeeping to drift.
- **Why documents instead of chat?** Context windows forget; documents version. Research → BRD → PDN → …chain is a DAG with typed edges, so impact analysis is a graph walk, not a memory.
- **What would production look like?** Same IA; swap localStorage for Postgres, the deterministic router for retrieval-augmented LLM calls over a code index, keep the evidence-or-flag contract, add SSO + Jira/Confluence write-back.
