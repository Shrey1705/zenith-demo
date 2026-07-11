// Demo Coach — a friendly, self-guided walkthrough. Anyone can open it and
// follow along in plain language, OR let Feasly do each step (or the whole
// demo) for them. Progress lives in localStorage so it survives navigation
// and reloads. Every "Do it for me" drives the real store via demoActions.
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from './AiPortal';
import { I } from './icons';
import { ACTIONS, PROMPT_1, PROMPT_2 } from './demoActions';

const KEY = 'feasly-coach-v1';

const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
const write = (s) => { localStorage.setItem(KEY, JSON.stringify(s)); window.dispatchEvent(new Event('feasly-coach-change')); };

export function startCoach() { write({ on: true, i: 0, min: false }); }

const LOCAL_Q = 'What happens when a customer misses an EMI instalment?';

// Each step: plain-English what & why. `do` maps to a demoActions key that
// performs the step for real; `doLabel` names its button. `copies` are
// one-click snippets. `core` steps make up the one-click auto-play (Acts 1–4).
const STEPS = [
  {
    act: 'Welcome',
    title: 'Build a real feature in 2 minutes',
    body: "You're about to take a product idea — letting customers pay monthly instead of yearly — all the way from a blank project to a complete, connected delivery plan. Follow the steps yourself, or let Feasly run the whole thing for you.",
    watch: "Tip: press ▶ Auto-play (top of this card) and just watch — Feasly builds everything on its own."
  },
  {
    act: 'Setup',
    title: 'Start from a clean slate',
    body: 'If this demo has been run in this browser before, clear it so we start fresh. Nothing valuable is lost — the two sample projects come right back.',
    manual: 'In the sidebar footer, click "Reset demo data".',
    do: 'reset', doLabel: 'Reset for me'
  },
  {
    act: 'Step 1 · Ask',
    title: 'Create a project',
    body: 'Every feature begins as a question. Make a project to hold everything about monthly payments.',
    manual: 'In the sidebar, press + next to "Projects" and type the name.',
    copies: [{ label: 'Project name', text: 'EMI & Payment Flexibility' }],
    do: 'createProject', doLabel: 'Create it for me', core: true
  },
  {
    act: 'Step 1 · Ask',
    title: 'Ask Feasly if it\'s even possible',
    body: 'Paste this question into the "Ask" box on the Research page. Feasly reads the real code and answers with a clear verdict — and it points to the exact file and line, so it can\'t just make things up.',
    watch: 'You\'ll get a red "this needs a core change" answer that quotes the pricing rules. Save it as a research note.',
    copies: [{ label: 'Question to ask', text: PROMPT_1 }],
    do: 'askResearch1', doLabel: 'Ask & save for me', core: true
  },
  {
    act: 'Step 1 · Ask',
    title: 'Bring in the payment facts',
    body: 'Good decisions need real constraints. Import the payment provider\'s capabilities so they sit right next to your research.',
    manual: 'On the Research page, click "Import API docs".',
    do: 'importGateway', doLabel: 'Import it for me', core: true
  },
  {
    act: 'Step 2 · Plan',
    title: 'Turn the research into a plan (BRD)',
    body: 'A BRD is just the plan for the feature. Create one, add the three things it must do, name who signs off, and tick both research notes so the plan is built on what you learned.',
    copies: [
      { label: 'BRD title', text: 'Offer monthly premium payment (EMI)' },
      { label: 'Requirement 1', text: 'Offer a monthly EMI payment option alongside annual at quote and checkout' },
      { label: 'Requirement 2', text: 'Compute an interest-free instalment schedule from the annual premium' },
      { label: 'Requirement 3', text: 'Reflect the selected payment plan on the review screen and proposal PDF' },
      { label: 'Stakeholders', text: 'Underwriting, Payments, D2C Journey PM' }
    ],
    do: 'fillBrd', doLabel: 'Write the plan for me', core: true
  },
  {
    act: 'Step 2 · Plan',
    title: 'Let Feasly check it, then save v1',
    body: 'Click "Check completeness". Feasly reviews the plan like a teammate and spots that the success measure is missing. Add it, then save the plan as version 1.',
    copies: [
      { label: 'Success criteria', text: 'EMI adoption ≥20% of new policies in the first quarter; no rise in the payment-default rate.' },
      { label: 'Version note', text: 'Initial draft from EMI research' }
    ],
    do: 'completeAndSaveV1', doLabel: 'Finish & save v1 for me', core: true
  },
  {
    act: 'Step 3 · Build',
    title: 'Generate the design note',
    body: 'Click "Generate PDN". Feasly checks your plan against the live code again and writes a design note — with an evidence table and a link back to exactly which plan version and research it came from.',
    do: 'generatePdn', doLabel: 'Generate it for me', core: true
  },
  {
    act: 'Step 3 · Build',
    title: 'Generate the whole delivery plan',
    body: 'Click "Generate delivery chain". Epics, user stories, detailed requirements and test cases all appear at once — each one linked back to the design note.',
    watch: 'The sidebar fills up: 2 epics, 5 stories, 9 requirements, 10 test cases — from one click.',
    do: 'generateChain', doLabel: 'Generate it for me', core: true
  },
  {
    act: 'Step 3 · Build',
    title: 'See how it all connects',
    body: 'Open any Test Case and look at the "Upstream" panel on the right. It traces the whole line: test → requirement → story → epic → design note → plan → the original research. Nothing floats loose.',
    do: 'gotoTest', doLabel: 'Take me there', core: true
  },
  {
    act: 'Step 3 · Build',
    title: 'See the project as a map',
    body: 'Open the Knowledge Graph and click the plan (BRD) box. This is the whole project as connected knowledge — not a pile of separate files.',
    do: 'gotoGraph', doLabel: 'Show me the map', core: true
  },
  {
    act: 'Step 4 · Change',
    title: 'Now the requirement changes',
    body: 'This is the part that breaks a normal chat-and-document workflow. Open Conversations, start a new one, and ask Feasly how to handle missed payments. It answers using the payment facts you imported earlier — then save that answer.',
    copies: [{ label: 'Question to ask', text: PROMPT_2 }],
    do: 'askConversation2', doLabel: 'Ask & save for me', core: true
  },
  {
    act: 'Step 4 · Change',
    title: 'Add the new rule and save v2',
    body: 'Open the plan again, add a fourth requirement for handling missed payments, and save it as version 2.',
    copies: [
      { label: 'Requirement 4', text: 'Define default handling: two consecutive missed instalments pause the policy pending payment' },
      { label: 'Version note', text: 'Added default handling after underwriting review' }
    ],
    do: 'addReq4SaveV2', doLabel: 'Update the plan for me', core: true
  },
  {
    act: 'Step 4 · Change',
    title: 'Watch everything notice the change',
    body: 'Open Test Cases. Every single one now says "upstream changed". You edited one sentence — and the entire plan knew instantly. Nobody had to chase anyone down.',
    do: 'gotoTest', doLabel: 'Show me the flagged tests', core: true
  },
  {
    act: 'Step 4 · Change',
    title: 'Regenerate — and watch the plan grow',
    body: 'Open the design note and click "Regenerate". The warnings clear everywhere, and the plan grows to cover the new rule: a new story about pausing the policy arrives with its own requirements and tests.',
    watch: 'Stories 5→6, requirements 9→12, tests 10→13 — and nothing left flagged.',
    do: 'regeneratePdn', doLabel: 'Regenerate for me', core: true
  },
  {
    act: 'Step 5 · Real AI (optional)',
    title: 'Switch to a real AI on this computer',
    body: 'Everything so far used Feasly\'s built-in offline brain. If you have Ollama running on this machine, you can switch to a real language model. Open Settings (sidebar footer) → Model Hub, detect it, and set it active — the "temperature" is kept low so it stays factual.',
    watch: 'This step needs Ollama running locally. If you don\'t have it, just skip ahead — the demo above is complete on its own.',
    do: 'detectLocal', doLabel: 'Detect & switch for me'
  },
  {
    act: 'Step 5 · Real AI (optional)',
    title: 'Ask the real model a question',
    body: 'Go to Research and ask this. The first question quietly turns every document and code file into numbers it can search, then the local model answers — showing chips for exactly which sources it used.',
    copies: [{ label: 'Question to ask', text: LOCAL_Q }],
    do: 'gotoResearch', doLabel: 'Take me to Research'
  },
  {
    act: 'Step 5 · Real AI (optional)',
    title: 'See the AI\'s memory as a map',
    body: 'Open the Semantic Map. Every dot is a document or piece of code turned into numbers. Dots that mean similar things sit close together. Click the plan\'s dot to see its nearest neighbours.',
    do: 'gotoMap', doLabel: 'Show me the map'
  },
  {
    act: 'Done',
    title: 'That\'s the whole idea',
    body: 'Feasly grounds every answer in real code, and turns each answer into a linked, versioned document — so when one thing changes, everything downstream knows. (The connected repos live in Settings → Connected Systems, in the sidebar footer.) That\'s the difference from chatting into a document that forgets what you told it.'
  }
];

export default function DemoCoach() {
  const nav = useNavigate();
  const { token } = useWorkspace();
  const [state, setState] = useState(read);
  const [copied, setCopied] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef(false);

  useEffect(() => {
    const sync = () => setState(read());
    window.addEventListener('feasly-coach-change', sync);
    return () => window.removeEventListener('feasly-coach-change', sync);
  }, []);

  if (!state?.on) return null;
  const i = Math.min(state.i, STEPS.length - 1);
  const step = STEPS[i];
  const setStep = (idx) => write({ ...state, i: Math.max(0, Math.min(STEPS.length - 1, idx)) });
  const go = (di) => setStep(i + di);
  const end = () => { stopRef.current = true; write({ on: false, i: 0, min: false }); };
  const copy = (label, text) => { navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(''), 1400); };

  // Run one step's action, then advance.
  const doStep = async () => {
    if (!step.do || busy) return;
    setBusy(true); setErr('');
    try {
      await ACTIONS[step.do]({ token, nav });
      setBusy(false);
      setTimeout(() => go(1), 350);
    } catch (e) { setErr(e.message || 'Something went wrong.'); setBusy(false); }
  };

  // Auto-play every core step (Acts 1–4) with a short pause between each so
  // the viewer can watch the workspace fill in.
  const autoPlay = async () => {
    if (playing) { stopRef.current = true; return; }
    setErr(''); setPlaying(true); stopRef.current = false;
    const coreIdx = STEPS.map((s, idx) => (s.core ? idx : -1)).filter((x) => x >= 0);
    try {
      for (const idx of coreIdx) {
        if (stopRef.current) break;
        setStep(idx);
        await new Promise((r) => setTimeout(r, 550));
        await ACTIONS[STEPS[idx].do]({ token, nav });
        await new Promise((r) => setTimeout(r, 650));
      }
    } catch (e) { setErr(e.message || 'Auto-play stopped.'); }
    setPlaying(false);
  };

  if (state.min) {
    return (
      <button className="coachmin" onClick={() => write({ ...state, min: false })}>
        <I n="play" s={12} /> Guided demo · {i + 1}/{STEPS.length}{playing ? ' · playing…' : ''}
      </button>
    );
  }

  return (
    <div className="coach">
      <div className="coachhead">
        <span className="coachact"><I n="sparkle" s={11} /> {step.act}</span>
        <span className="coachops">
          <button className={'coachplay' + (playing ? ' on' : '')} onClick={autoPlay} title="Let Feasly run the whole demo">
            <I n={playing ? 'pause' : 'play'} s={11} /> {playing ? 'Stop' : 'Auto-play'}
          </button>
          <button title="Minimize" onClick={() => write({ ...state, min: true })}>—</button>
          <button title="Exit the guided demo" onClick={end}><I n="x" s={13} /></button>
        </span>
      </div>

      <h4>{step.title}</h4>
      <p>{step.body}</p>
      {step.manual && <p className="coachmanual">{step.manual}</p>}
      {step.watch && <p className="coachwatch">{step.watch}</p>}

      {step.copies?.map((c) => (
        <div key={c.label} className="coachcopy">
          <span className="coachcopylabel">{c.label}</span>
          <pre>{c.text}</pre>
          <button onClick={() => copy(c.label, c.text)}>{copied === c.label ? 'Copied ✓' : 'Copy'}</button>
        </div>
      ))}

      {step.do && (
        <button className="coachdo" disabled={busy || playing} onClick={doStep}>
          {busy ? 'Working…' : <><I n="sparkle" s={13} /> {step.doLabel}</>}
        </button>
      )}
      {err && <p className="coacherr">{err}</p>}

      <div className="coachfoot">
        <button className="linkbtn" disabled={i === 0 || playing} onClick={() => go(-1)}>← Back</button>
        <span className="coachprog">{i + 1} / {STEPS.length}</span>
        {i < STEPS.length - 1
          ? <button className="coachnext" disabled={playing} onClick={() => go(1)}>Next →</button>
          : <button className="coachnext" onClick={end}>Finish 🎉</button>}
      </div>
    </div>
  );
}
