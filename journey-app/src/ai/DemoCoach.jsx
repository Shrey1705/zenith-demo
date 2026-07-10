// Demo Coach — a floating step-by-step guide through the full interview
// run-of-show (see FEASLY_DEMO.md). State lives in localStorage so it
// survives navigation and reloads; prompts have one-click copy buttons so
// nothing needs to be typed on stage.
import React, { useState, useEffect } from 'react';

const KEY = 'feasly-coach-v1';

const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
const write = (s) => { localStorage.setItem(KEY, JSON.stringify(s)); window.dispatchEvent(new Event('feasly-coach-change')); };

export function startCoach() { write({ on: true, i: 0, min: false }); }

const PROMPT_1 = `Task: assess whether Zenith can offer monthly EMI premium payments today.
Scope: rating rules, payment lifecycle, proposal API contract.
Constraints: cite file-and-line evidence for every claim; if something cannot be verified in code, flag it — do not guess.
Output: current constraint, impacted systems, severity.`;

const PROMPT_2 = `Context: our payment gateway retries a failed instalment webhook for 72 hours and has no native default handling; mandates are capped at ₹15,000 per instalment.
Task: recommend a default-handling rule for missed EMI instalments on a health policy that bounds underwriting risk without cancelling cover.
Output: one BRD-ready requirement sentence plus a 3-line rationale.`;

const STEPS = [
  { act: 'Before you start', title: 'The story you\'re telling', body: 'Frame it in 30 seconds: "Today my AI workflow is a chat window and a Word document — the AI forgets context and hallucinates, and no document knows when another one changed. Feasly fixes both: every answer is grounded in the actual codebase with evidence, and every output is a document in a knowledge graph. Let me build a real feature from an empty project, right now."' },
  { act: 'Before you start', title: 'Reset to a clean slate', body: 'On Home, click "↺ Reset demo data" (bottom of the page) if you\'ve rehearsed in this browser. Confirm there is NO EMI project — only High-Value Cover Expansion (your fallback) and Nominee & KYC. Building EMI live is the whole point.' },
  { act: 'Act 1 · Research', title: 'Create the project', body: 'On Home, type the project name into "New project…" and click Create. You\'ll land in an empty Research workspace — every feature starts as a question, not a document.', copies: [{ label: 'Project name', text: 'EMI & Payment Flexibility' }] },
  { act: 'Act 1 · Research', title: 'Ask the engineered prompt', body: 'Paste Prompt 1 into the Ask bar. Point out the structure — Task, Scope, Constraints, Output — and the answer: a red verdict with file-and-line evidence like premium.rules.yaml:6. It reads the connected repo; the constraints forbid guessing.', copies: [{ label: 'Prompt 1 — feasibility', text: PROMPT_1 }] },
  { act: 'Act 1 · Research', title: 'Save the answer as knowledge', body: 'Click "Save as research document". In a chat workflow this answer would scroll away and die; here it becomes a first-class document a BRD can cite. Then click "← Research" to go back.' },
  { act: 'Act 1 · Research', title: 'Import the gateway docs', body: 'Click "🔌 Import API docs". A gateway-capabilities document appears: recurring mandates, ₹15k ceiling per instalment, 72-hour webhook retries, and — crucially — no native default handling. Two research documents in under two minutes.' },
  { act: 'Act 2 · BRD', title: 'Create the BRD', body: 'Sidebar → BRDs → type the title → Create.', copies: [{ label: 'BRD title', text: 'Offer monthly premium payment (EMI)' }] },
  { act: 'Act 2 · BRD', title: 'Add the three requirements', body: 'Add each requirement with Enter. Then set Stakeholders and tick BOTH research documents under "Research in context" — the BRD is written from knowledge, not from memory.', copies: [
    { label: 'Requirement 1', text: 'Offer a monthly EMI payment option alongside annual at quote and checkout' },
    { label: 'Requirement 2', text: 'Compute an interest-free instalment schedule from the annual premium' },
    { label: 'Requirement 3', text: 'Reflect the selected payment plan on the review screen and proposal PDF' },
    { label: 'Stakeholders', text: 'Underwriting, Payments, D2C Journey PM' }
  ] },
  { act: 'Act 2 · BRD', title: 'Let the AI review it', body: 'Click "✦ Check completeness" in the right rail. It reviews the BRD like a colleague — and catches that success criteria are missing. Fill them in, then in the Versions rail save as v1.', copies: [
    { label: 'Success criteria', text: 'EMI adoption ≥20% of new policies in the first quarter; no rise in payment-default rate' },
    { label: 'Version note', text: 'Initial draft from EMI research' }
  ] },
  { act: 'Act 3 · One click', title: 'Generate the PDN', body: 'Click "⚡ Generate PDN". This isn\'t a template — it re-analysed your requirements against the codebase. Show the impact table with file-and-line evidence, and the trace rail: the PDN knows it came from BRD v1 and both research documents.' },
  { act: 'Act 3 · One click', title: 'Generate the delivery chain', body: 'Click "⚡ Generate delivery chain". Point at the sidebar: 2 Epics, 5 User Stories, 9 Functional Reqs, 10 Test Cases — the entire delivery scaffold from one click, all traceable.' },
  { act: 'Act 3 · One click', title: 'Walk the chain upstream', body: 'Open any Test Case and walk the Upstream rail out loud: test → FR → story → epic → PDN → BRD v1 → the research. "In Word this chain lives in my head. Here it\'s structural."' },
  { act: 'Act 3 · One click', title: 'Show the Knowledge Graph', body: 'Sidebar → Knowledge Graph → click the BRD node. This is the project as knowledge, not folders — one click shows everything this BRD created.' },
  { act: 'Act 4 · The change', title: 'A new constraint appears', body: '"Now the thing that breaks every chat-plus-Word workflow: the requirement changes." Sidebar → Conversations → + New conversation → paste Prompt 2. The answer recommends pausing the policy after two consecutive missed instalments, grounded in the gateway research. Click "Save to Research" on the reply.', copies: [{ label: 'Prompt 2 — default handling', text: PROMPT_2 }] },
  { act: 'Act 4 · The change', title: 'Change the BRD → v2', body: 'Open the EMI BRD, add requirement 4, then save as v2 with the note.', copies: [
    { label: 'Requirement 4', text: 'Define default handling: two consecutive missed instalments pause the policy pending payment' },
    { label: 'Version note', text: 'Added default handling after underwriting review' }
  ] },
  { act: 'Act 4 · The change', title: 'The moment: everything knows', body: 'Sidebar → Test Cases. Every single one is flagged "upstream changed". Say it slowly: "I changed one sentence. Nobody emailed QA. The workspace knows, structurally, that these were generated from v1 and the BRD is now at v2."' },
  { act: 'Act 4 · The change', title: 'Regenerate — the chain grows', body: 'Open the PDN → amber banner → "Regenerate from v2". Staleness clears (0/13 flagged) and the chain GREW: 5→6 stories, 9→12 FRs, 10→13 tests. The new story "Handle missed instalments and pause the policy" arrived with its own FRs and DFLT Gherkin tests. Show the Knowledge Graph — visibly bigger.' },
  { act: 'Act 5 · Real AI, locally', title: 'Switch on the local model', body: 'Settings → Model Hub. Click "↻ Detect Ollama" — it finds the models running on this Mac. Point at the temperature slider locked low at 0.1: "factual, minimal hallucination". Click "Set active" on the Ollama card. From now on, answers come from a real LLM on this machine — no cloud.' },
  { act: 'Act 5 · Real AI, locally', title: 'Ask the real model', body: 'Go to Research (or any conversation) and ask a free-form question. First ask builds the vector index — every document and code file embedded locally. The answer arrives with "Grounded on:" source chips and the engine label. This is RAG: retrieve by meaning, generate at temp 0.1, cite or say unverified.', copies: [{ label: 'Local-model question', text: 'What happens when a customer misses an EMI instalment?' }] },
  { act: 'Act 5 · Real AI, locally', title: 'Show the Semantic Map', body: 'Sidebar → Semantic Map. "The knowledge isn\'t stored as words — it\'s stored as 768-dimensional vectors." Click the BRD dot: its nearest neighbors by meaning are its own PDN and the payment rules. Add a document later, re-index, and the constellation grows.' },
  { act: 'Close', title: 'Why it can\'t hallucinate', body: 'Settings → Connected Systems. "Read-only connectors to the actual repos, every claim carries evidence, low-temperature retrieval-grounded generation, and everything the AI produces becomes a versioned, linked document instead of context-window residue. That\'s my answer to the copy-paste-into-Word workflow." Done — end the tour.' }
];

export default function DemoCoach() {
  const [state, setState] = useState(read);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    const sync = () => setState(read());
    window.addEventListener('feasly-coach-change', sync);
    return () => window.removeEventListener('feasly-coach-change', sync);
  }, []);

  if (!state?.on) return null;
  const i = Math.min(state.i, STEPS.length - 1);
  const step = STEPS[i];
  const go = (di) => write({ ...state, i: Math.max(0, Math.min(STEPS.length - 1, i + di)) });
  const end = () => write({ on: false, i: 0, min: false });
  const copy = (label, text) => { navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(''), 1400); };

  if (state.min) {
    return (
      <button className="coachmin" onClick={() => write({ ...state, min: false })}>
        🎬 Demo · step {i + 1}/{STEPS.length}
      </button>
    );
  }

  return (
    <div className="coach">
      <div className="coachhead">
        <span className="coachact">{step.act}</span>
        <span className="coachops">
          <button title="Minimize" onClick={() => write({ ...state, min: true })}>—</button>
          <button title="End the guided demo" onClick={end}>✕</button>
        </span>
      </div>
      <h4>{step.title}</h4>
      <p>{step.body}</p>
      {step.copies?.map((c) => (
        <div key={c.label} className="coachcopy">
          <span className="coachcopylabel">{c.label}</span>
          <pre>{c.text}</pre>
          <button onClick={() => copy(c.label, c.text)}>{copied === c.label ? 'Copied ✓' : 'Copy'}</button>
        </div>
      ))}
      <div className="coachfoot">
        <button className="linkbtn" disabled={i === 0} onClick={() => go(-1)}>← Back</button>
        <span className="coachprog">Step {i + 1} / {STEPS.length}</span>
        {i < STEPS.length - 1
          ? <button className="coachnext" onClick={() => go(1)}>Next →</button>
          : <button className="coachnext" onClick={end}>Finish 🎉</button>}
      </div>
    </div>
  );
}
