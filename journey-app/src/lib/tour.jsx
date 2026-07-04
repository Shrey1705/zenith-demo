// Guided walkthrough — the shortest path from landing to running one AI
// analysis. A polling-based spotlight: no per-component wiring beyond a
// data-tour attribute on the target element, so it stays cheap to extend.
//
// Advance conditions:
//   'click'  — fires when the target (or a descendant) is clicked.
//   'value'  — fires when the target <input>'s value passes `test`.
// State persists to sessionStorage so it survives the AI handoff, which is
// a real page navigation (plain <a href>), not a client-side route change.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'zenith-tour-state';

export const TOUR_STEPS = [
  { id: 'dob-self', selector: '[data-tour="dob-self"]', advance: 'value', test: (v) => /^\d{2}\/\d{2}\/\d{4}$/.test(v),
    title: 'Step 1 — Date of birth', body: "Type your DOB — we'll auto-insert the slashes and confirm it's valid." },
  { id: 'pincode', selector: '[data-tour="pincode"]', advance: 'value', test: (v) => /^[1-9][0-9]{5}$/.test(v),
    title: 'Step 2 — Pincode', body: 'Your pincode sets metro vs non-metro pricing. Try 400001.' },
  { id: 'ped-no', selector: '[data-tour="ped-no"]', advance: 'click',
    title: 'Step 3 — Medical history', body: "We'll answer No here — the shortest path skips the medical questionnaire." },
  { id: 'quote-continue', selector: '[data-tour="wizard-next"]', advance: 'click',
    title: 'Step 4 — Your premium is live', body: 'Apex is pre-selected as our top plan. Continue when ready.' },
  { id: 'mobile', selector: '[data-tour="mobile"]', advance: 'value', test: (v) => /^[6-9]\d{9}$/.test(v),
    title: 'Step 5 — Mobile number', body: 'Any valid-looking 10-digit number works — the OTP is simulated.' },
  { id: 'send-otp', selector: '[data-tour="send-otp"]', advance: 'click',
    title: 'Step 6 — Verify', body: "Send the OTP — it auto-fills and verifies in under a second." },
  { id: 'proposer-name', selector: '[data-tour="proposer-name"]', advance: 'value', test: (v) => v.trim().length > 1,
    title: 'Step 7 — Your name', body: "Add a name — we'll need a valid-looking email next, then PAN is optional." },
  { id: 'proposer-email', selector: '[data-tour="proposer-email"]', advance: 'value', test: (v) => /^\S+@\S+\.\S+$/.test(v),
    title: 'Step 8 — Your email', body: 'Any valid-looking email works, e.g. you@example.com.' },
  { id: 'details-continue', selector: '[data-tour="wizard-next"]', advance: 'click', verify: true,
    title: 'Step 9 — On to review', body: "We'll skip the nominee — it's optional at this stage." },
  { id: 'review-confirm', selector: '[data-tour="wizard-next"]', advance: 'click', verify: true,
    title: 'Step 10 — Review looks good', body: 'Confirm to move to payment.' },
  { id: 'pay-button', selector: '[data-tour="pay-button"]', advance: 'click',
    title: 'Step 11 — Simulated payment', body: 'This is a demo gateway — no real money moves. Go ahead and pay.' },
  { id: 'ai-handoff', selector: '[data-tour="ai-handoff"]', advance: 'click',
    title: 'Step 12 — Policy issued!', body: "That's the customer side. Now for the actual product, Feasly — click through." },
  { id: 'ai-sample-emi', selector: '[data-tour="ai-sample-emi"]', advance: 'click',
    title: 'Step 13 — Ask a product question', body: "You're logged into Feasibility Studio already. Click this sample question — it analyzes instantly." },
  { id: 'done', info: true,
    title: "That's the full demo", body: 'Explore the left nav — PDN Draft, User Stories and Test Cases hold this analysis; Copilot Chat answers general PM questions too.' }
];

const TourContext = createContext(null);

function readStorage() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { active: false, stepIndex: 0 };
  } catch { return { active: false, stepIndex: 0 }; }
}
function writeStorage(state) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export function TourProvider({ children }) {
  const [state, setState] = useState(readStorage);

  const start = useCallback(() => {
    const next = { active: true, stepIndex: 0 };
    writeStorage(next); setState(next);
  }, []);
  const stop = useCallback(() => {
    const next = { active: false, stepIndex: 0 };
    writeStorage(next); setState(next);
  }, []);
  const advance = useCallback(() => {
    setState((s) => {
      const stepIndex = s.stepIndex + 1;
      const active = stepIndex < TOUR_STEPS.length;
      const next = { active, stepIndex: active ? stepIndex : 0 };
      writeStorage(next);
      return next;
    });
  }, []);

  return (
    <TourContext.Provider value={{ ...state, start, stop, advance, currentStep: TOUR_STEPS[state.stepIndex] }}>
      {children}
    </TourContext.Provider>
  );
}

export const useTour = () => useContext(TourContext);

// Polls the DOM for the current step's target and wires up its advance
// condition. Lives inside TourOverlay so it only runs while rendered.
export function useTourTracking() {
  const tour = useTour();
  const [rect, setRect] = useState(null);
  const wiredRef = useRef(null);

  useEffect(() => {
    if (!tour?.active || !tour.currentStep || tour.currentStep.info) { setRect(null); return; }
    const step = tour.currentStep;
    wiredRef.current = null;

    const poll = setInterval(() => {
      const el = document.querySelector(step.selector);
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) { setRect(null); return; }
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });

      if (wiredRef.current !== step.id) {
        wiredRef.current = step.id;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // 'value' steps: check the already-rendered value each tick, rather
      // than a native 'input' listener — that would race React's own
      // controlled-input re-render (e.g. the DOB slash auto-insert) and
      // read the pre-formatted keystroke instead of the settled value.
      if (step.advance === 'value') {
        if (step.test(el.value || '')) tour.advance();
        return;
      }

      if (el.dataset.tourWired === step.id) return;
      el.dataset.tourWired = step.id;

      if (step.advance === 'click' && step.verify) {
        // Gated action (e.g. Continue past a form): the click might just
        // surface a validation error rather than actually advance the
        // wizard. Check for that before trusting the click, and re-arm so
        // the same click can be retried once the user fixes the field.
        const onClick = () => {
          el.removeEventListener('click', onClick, true);
          setTimeout(() => {
            if (document.querySelector('.error')) { delete el.dataset.tourWired; return; }
            tour.advance();
          }, 300);
        };
        el.addEventListener('click', onClick, true);
      } else if (step.advance === 'click') {
        // Capture phase + fires synchronously before any navigation the
        // click triggers (e.g. the AI handoff's plain <a href>), so the
        // sessionStorage write below always lands before the page unloads.
        const onClick = () => { tour.advance(); el.removeEventListener('click', onClick, true); };
        el.addEventListener('click', onClick, true);
      }
    }, 200);

    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour?.active, tour?.stepIndex]);

  return rect;
}
