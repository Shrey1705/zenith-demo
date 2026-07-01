import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import JourneyWizard from './journey/JourneyWizard';
import AgentPortal from './agent/AgentPortal';
import PayLink from './pay/PayLink';
import AiPortal from './ai/AiPortal';
import DemoBanner from './components/DemoBanner';

function Landing() {
  return (
    <div className="page landing">
      <h1>Zenith <span className="accent">Health Insurance</span></h1>
      <p className="hint">A portfolio prototype by Shrey Sagar — an evidence-backed AI feasibility layer on top of a working insurance issuance system.</p>

      <section className="landing-copy">
        <p>
          Hi, I'm <b>Shrey Sagar</b> — a Product Manager with 5+ years across health insurance and consumer
          products. I've owned products end-to-end: ideation, BRDs, underwriting and actuarial sign-off,
          engineering delivery, GTM, and post-launch tracking, across portfolios worth thousands of crores
          in premium. This started as a side project to solve a problem I kept running into in my day-to-day.
        </p>
      </section>

      <section className="landing-copy">
        <h2>Why this exists</h2>
        <p>
          In any established insurance company, every product idea eventually hits the same wall:
          <i> "Is this even feasible, and what does it actually touch?"</i> Today that means pulling in
          three or four engineers and waiting days for an answer — and what comes back is usually someone's
          best recollection of a system with years of accumulated complexity, not something you can verify.
          A wrong "yes" derails a sprint; a wrong "no" kills a good idea before it's scoped.
        </p>
      </section>

      <section className="landing-copy">
        <h2>What I built</h2>
        <p>
          A working health insurance issuance system — real premium and underwriting rules, a proposal
          lifecycle, agent and customer journeys, a payment flow — with an AI feasibility portal layered on
          top that reads the <b>actual source code</b>, not docs or memory. Ask it a change request in plain
          English and it returns a traffic-light verdict per system layer, each claim backed by a specific
          file and line number, plus a draft PDN, Jira-ready stories, and Gherkin test cases. If it can't
          verify a claim against real code, it says so instead of guessing.
        </p>
      </section>

      <section className="landing-copy">
        <h2>Try it yourself — takes 5 minutes</h2>
      </section>
      <div className="cardsrow">
        <Link className="bigcard" to="/buy">
          <h3>🛡 Buy health insurance</h3>
          <p>Walk the customer journey: pick members, answer medical questions, get a live premium, pay, and get issued instantly.</p>
        </Link>
        <Link className="bigcard" to="/agent">
          <h3>💼 Agent portal</h3>
          <p>Run the journey on behalf of a customer, send a payment link, and watch it flip to Issued in real time.</p>
        </Link>
        <Link className="bigcard" to="/ai">
          <h3>🤖 AI feasibility portal</h3>
          <p>Log in and ask "can we make nominee mandatory?" — get a verdict, a PDN, and test cases, grounded in live code evidence.</p>
        </Link>
      </div>
      <p className="hint">Architecture: journey-app (React) → core-policy-system API (rules, rating, proposals, payments) · ai-service scans both codebases.</p>
    </div>
  );
}

export default function App() {
  return (
    <>
      <DemoBanner />
      <nav className="topnav">
        <Link to="/" className="brand">zenith<span className="accent">demo</span></Link>
        <span>
          <Link to="/buy">Buy</Link>
          <Link to="/agent">Agent</Link>
          <Link to="/ai">AI portal</Link>
        </span>
      </nav>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/buy" element={<div className="page"><JourneyWizard mode="customer" /></div>} />
        <Route path="/agent" element={<AgentPortal />} />
        <Route path="/pay/:token" element={<PayLink />} />
        <Route path="/ai" element={<AiPortal />} />
      </Routes>
    </>
  );
}
