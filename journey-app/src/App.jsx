import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import JourneyWizard from './journey/JourneyWizard';
import PayLink from './pay/PayLink';
import AiPortal from './ai/AiPortal';
import PricingPage from './PricingPage';
import DemoBanner from './components/DemoBanner';

const LINKEDIN_URL = 'https://www.linkedin.com/in/shrey-sagar-productmanager/';

const PILLARS = [
  {
    h: 'Better decisions',
    p: 'Every decision records its alternatives, evidence and confidence — and the AI answers feasibility from your actual code, with file-and-line proof. No more deciding on recollection.'
  },
  {
    h: 'Faster execution',
    p: 'A question becomes a grounded spec, stories, requirements and test cases in minutes. Six playbooks write your documents from your own data.'
  },
  {
    h: 'Lower time-to-market',
    p: 'One traceable chain from research to a release pipeline with a computed Definition of Done. When a requirement moves, everything built on it flags itself stale — you never ship against drift.'
  },
  {
    h: 'Organizational learning',
    p: 'Decisions come back on their review date asking "what actually happened?" Outcomes and lessons accumulate into a memory your whole team — and every new hire — can query.'
  },
  {
    h: 'Defensible by design',
    p: 'The AI runs on your own machines — documents never leave. An evidence trail behind every choice, roles that gate who changes what. Compliance-friendly by architecture, not by promise.'
  }
];

function Landing() {
  return (
    <div className="landing">
      <section className="hero">
        <h1>Your team ships code, tickets and docs.<br /><span className="accent">Nobody ships the "why."</span></h1>
        <p>
          Every org has a system of record for code, tickets and documents — and none for <b style={{ color: '#fff' }}>decisions</b>.
          The alternatives you weighed, the evidence you had, what actually happened: gone in six months.
          <b style={{ color: '#fff' }}> Feasly</b> is the AI workspace where product decisions are made,
          executed and remembered — grounded in your data, running on your machines.
        </p>
        <div className="herobtns">
          <Link className="btn gold" to="/ai">Open the workspace →</Link>
          <Link className="btn ghost light" to="/pricing">Founding-member pricing</Link>
        </div>
      </section>

      <section className="landing-section">
        <h2>What that means in practice</h2>
      </section>
      <div className="pillargrid">
        {PILLARS.map((x) => (
          <div key={x.h} className="pillarcard">
            <h3>{x.h}</h3>
            <p>{x.p}</p>
          </div>
        ))}
      </div>

      <section className="landing-section">
        <h2>Watch it work on a real system</h2>
        <p>
          Below this workspace runs <b>Zenith</b> — a working health-insurance platform wired in as the live tenant.
          Buy a policy and you become a data point: the journey is <b>instrumented like Amplitude</b>, bookings
          aggregate into insights, and both land in the workspace as evidence a decision can cite.
          Ask "can we offer EMI payments?" and watch the answer arrive with file-and-line proof.
        </p>
      </section>
      <div className="cardsrow">
        <Link className="bigcard" to="/buy">
          <span className="stepnum">1</span>
          <h3>Be the customer</h3>
          <p>Buy a policy on the live tenant — quote, details, payment, instant issue. Every step you take feeds the funnel in Signals. ~3 minutes.</p>
        </Link>
        <Link className="bigcard" to="/ai">
          <span className="stepnum">2</span>
          <h3>Be the PM</h3>
          <p>Open the workspace: see your own session in the funnel, save it as evidence, record the decision, generate the delivery chain, promote the release. ~5 minutes.</p>
        </Link>
      </div>

      <div className="howto">
        <h3>The loop you're about to see</h3>
        <ol>
          <li><b>Signal:</b> real drop-off and booking data from the journey lands in the workspace.</li>
          <li><b>Decision:</b> record what you chose, the alternatives, the evidence, your confidence — and a review date.</li>
          <li><b>Delivery:</b> the spec, stories, tests and release pipeline generate from the decision and stay traceable to it.</li>
          <li><b>Memory:</b> on the review date, Feasly asks "what actually happened?" — the answer becomes organizational memory.</li>
        </ol>
        <p className="hint">Guided demo inside the workspace · demo login comes prefilled · your own private workspace is one email away.</p>
      </div>

      <div className="about">
        <h3>Built by Shrey Sagar</h3>
        <p>
          Product manager, 5+ years across health insurance and consumer products.
          Feasly is my answer to the question every team I've worked on kept asking:
          <i> "wait — why did we decide that?"</i>
        </p>
        <p><a href={LINKEDIN_URL} target="_blank" rel="noreferrer">Connect on LinkedIn ↗</a></p>
      </div>
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
          <Link to="/ai">Feasly</Link>
          <Link to="/pricing">Pricing</Link>
        </span>
      </nav>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/buy" element={<div className="page page-wide"><JourneyWizard /></div>} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/pay/:token" element={<PayLink />} />
        <Route path="/ai/*" element={<AiPortal />} />
      </Routes>
    </>
  );
}
