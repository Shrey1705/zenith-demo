# Zenith/Feasly — System Architecture (v2)

**Objective:** 4 paying customers by **22 Sept 2026**. Delivery plan lives in `ROADMAP.md`; this doc is the technical operating model.
**Revision note (2026-07-16):** v2 replaces the v1 delegation model. The local model now has **view rights only** — it never writes or modifies product code. Humans + Claude write code; the local model provides clarity and simulation.

---

## 1. Local model stack — the decision

Verified by direct inspection on 2026-07-16, three model servers were running **simultaneously**, which is why local inference felt slow (~8 tok/s on both coders; weights page in/out of 32GB unified memory as servers alternate):

| Server | Port | Model | Verdict |
|---|---|---|---|
| **vMLX** | `*:8080` (LAN-visible) | Qwen2.5-Coder-14B-4bit loaded; Qwen3-Coder-30B-A3B-6bit also available | **PRIMARY — keep** |
| LM Studio | `127.0.0.1:1234` | Qwen3-Coder-30B-A3B-6bit | Quit during dev; optional GUI chat |
| Ollama | `127.0.0.1:11434` | llama3.2 + nomic-embed-text | Keep — Feasly's in-app RAG depends on it |

**Standing rule: run ONE coder server at a time.** vMLX is primary (Shrey's preference, has both models, LAN-visible, OpenAI-compatible `/v1/*` verified). Daily driver: **Qwen2.5-Coder-14B** (lighter, leaves headroom for Vite/browser/Claude). Load Qwen3-30B in vMLX only for heavy reasoning sessions, then unload. Quit LM Studio while developing.

All tooling speaks **OpenAI-compatible** `/v1/chat/completions` and auto-detects the live server (:8080 first, :1234 fallback), so nothing breaks if the stack changes.

## 2. Roles — who does what

| Actor | Rights | Responsibilities |
|---|---|---|
| **Shrey** | full | Product decisions, customer conversations, final approval on every change, Stripe/financial setup |
| **Claude** | read/write (with Shrey in the loop) | Architecture, ALL production code, reviews, specs, this doc |
| **Local Qwen** | **READ-ONLY** | (a) Codebase explainer — "what did we build, how does X work" without relying on memory or old docs; (b) Customer-persona roleplay in the sim engine; (c) Drafting text artifacts: docs, interview scripts, summaries |

The local model never edits files. Its purpose is human-in-the-loop clarity: when Claude tokens run out, development pauses but **understanding never does**.

## 3. Shrey's interface to the local model (token-outage workflow)

Two commands, installed in `~/bin`, work from any terminal:

```bash
# General question (auto-detects vMLX or LM Studio):
ask "difference between the deterministic demo brain and the Ollama RAG path?"

# Codebase clarity — THE view-rights tool. Files + question:
explain core-service/src/services/premiumService.js "how is premium calculated step by step?"
explain journey-app/src/ai/workspace.js "when does a lifecycle stage count as done?"
```

Verified working E2E against vMLX (2026-07-16). Escalation path when tokens run out mid-feature: `ask` the model to summarize the in-progress diff (`git diff | ask "summarize what this change does and what looks unfinished"`), note the state in `tasks/HANDOFF.md`, resume with Claude later. For casual back-and-forth, vMLX/LM Studio's own chat window is fine too — same model.

Largest logic file (workspace.js, ~8k tokens) fits in context, so whole-file explains work; no chunking machinery needed.

## 4. Customer Simulation Engine — reframed

**Purpose (per Shrey):** not a replacement for market testing — a **rehearsal for it**. The personas generate pointers, questions, and a scorecard that guide real user interviews before launch. Output is "what to ask humans and what to fix first," not "launch/don't launch."

```
sim/
├── personas/*.json      7 personas (startup-pm, enterprise-pm, insurance-pm,
│                        ai-founder, eng-manager, product-analyst, cto)
├── rubric.js            9 weighted categories, weights sum to 1.0
├── evaluate.js          persona × captured flow → Qwen roleplay → strict JSON scores
├── report.js            weighted aggregate → sim/reports/build-<sha>.md
└── interview-prep.js    NEW: converts each persona's pain points + low-scoring
                         categories into a printable interview guide:
                         questions to ask real PMs, hypotheses to validate,
                         and a scoring sheet to fill during the call
```

Persona JSON model: `{ id, name, profile: { goals, frustrations, behaviour, technicalAbility, riskTolerance, preferredWorkflow, budgetSensitivity, decisionStyle, expectedFeatures }, weights: { onboarding, navigation, speed, featureUsefulness, trust, clarity, perceivedIntelligence, likelihoodToPay, likelihoodToRecommend } }`

Each evaluation runs 3× per persona, median per category, variance printed (LLM judges are noisy — a score change smaller than the variance is not signal). Runs 100% on local Qwen; Claude reads only the report.

**Report answers three questions:** Is this build sellable as-is (weighted score + blockers)? What would each segment complain about first? What must I verify with real humans (feeds `interview-prep.js`)?

## 5. Token-economy rules (standing)

1. Claude writes code only after checking whether the change is small enough for Shrey to make by hand with `explain`-assisted understanding.
2. Sim engine, interview prep, docs, summaries: 100% local inference.
3. Claude reads diffs and reports, not whole files, unless a review flags something.
4. One architecture doc (this file), one roadmap (`ROADMAP.md`); no parallel strategy threads.
