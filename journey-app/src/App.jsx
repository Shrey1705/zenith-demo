import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import JourneyWizard from './journey/JourneyWizard';
import AgentPortal from './agent/AgentPortal';
import PayLink from './pay/PayLink';
import AiPortal from './ai/AiPortal';
import DemoBanner from './components/DemoBanner';
import TourOverlay from './components/TourOverlay';
import { TourProvider, useTour } from './lib/tour';

const LINKEDIN_URL = 'https://www.linkedin.com/in/shrey-sagar-productmanager/';

function Landing() {
  const nav = useNavigate();
  const tour = useTour();
  const guideMe = () => { tour.start(); nav('/buy'); };

  return (
    <div className="landing">
      <section className="hero">
        <h1>Every product idea hits the same wall:<br /><span className="accent">"is this even feasible?"</span></h1>
        <p>
          Zenith is a working health insurance system — with an AI portal on top
          that answers that question from the actual code, with evidence.
        </p>
        <div className="herobtns">
          <Link className="btn gold" to="/buy">Start the demo →</Link>
          <button className="btn ghost light" onClick={guideMe}>Guide me step by step →</button>
        </div>
      </section>

      <section className="landing-section">
        <h2>The problem</h2>
        <p>
          A PM asking "what does this change touch?" waits days for an answer assembled
          from engineers' memory of a system too complex to remember.
          A wrong <b>yes</b> burns a sprint. A wrong <b>no</b> kills a good idea.
        </p>
      </section>

      <section className="landing-section">
        <h2>The idea</h2>
        <p>
          Ground the answer in code, not recollection. Describe a change in plain English —
          the portal scans the live system and returns a <b>verdict per layer</b>, every claim
          backed by a <b>file and line number</b>, plus a PDN draft, stories and test cases.
          What it can't verify, it flags instead of guessing.
        </p>
      </section>

      <section className="landing-section">
        <h2>See it work — 5 minutes</h2>
      </section>
      <div className="cardsrow">
        <Link className="bigcard" to="/buy">
          <span className="stepnum">1</span>
          <h3>Buy a policy</h3>
          <p>A complete issuance journey on a real rules engine — quote, details, pay, instant policy. ~3 minutes.</p>
        </Link>
        <Link className="bigcard" to="/ai">
          <span className="stepnum">2</span>
          <h3>Ask the AI portal</h3>
          <p>The PM tool that reads this very system's code. Ask for a change, get an evidence-backed verdict. ~2 minutes.</p>
        </Link>
      </div>

      <div className="howto">
        <h3>How to run the demo</h3>
        <ol>
          <li>Buy: get a quote → your details → simulated payment → policy issued instantly.</li>
          <li>The success screen takes you straight into the AI portal.</li>
          <li>Try <i>"Make nominee details mandatory"</i> — login <code>pm / zenith@123</code> comes prefilled.</li>
        </ol>
        <p className="hint">Or click <b>"Guide me step by step"</b> above and we'll spotlight exactly what to do, the whole way through.</p>
      </div>

      <div className="about">
        <h3>Built by Shrey Sagar</h3>
        <p>
          Product manager, 5+ years across health insurance and consumer products —
          from 0→1 launches to portfolio-scale delivery. This project is how I think
          the feasibility conversation should work.
        </p>
        <p><a href={LINKEDIN_URL} target="_blank" rel="noreferrer">Connect on LinkedIn ↗</a></p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <TourProvider>
      <DemoBanner />
      <nav className="topnav">
        <Link to="/" className="brand">zenith<span className="accent">demo</span></Link>
        <span>
          <Link to="/buy">Buy</Link>
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
      <TourOverlay />
    </TourProvider>
  );
}
