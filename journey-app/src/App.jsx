import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import JourneyWizard from './journey/JourneyWizard';
import AgentPortal from './agent/AgentPortal';
import PayLink from './pay/PayLink';
import AiPortal from './ai/AiPortal';

function Landing() {
  return (
    <div className="page landing">
      <h1>Elevate-style Health Insurance <span className="accent">Demo</span></h1>
      <p className="hint">Portfolio prototype by Shrey Sagar — inspired by ICICI Lombard Elevate's issuance journey. Not affiliated with ICICI Lombard.</p>
      <div className="cardsrow">
        <Link className="bigcard" to="/buy">
          <h3>🛡 Buy health insurance</h3>
          <p>Customer journey: members → declarations → quote with add-ons → review → pay → instant issuance.</p>
        </Link>
        <Link className="bigcard" to="/agent">
          <h3>💼 Agent portal</h3>
          <p>Run the journey on behalf of a customer, send a payment link, watch it get issued.</p>
        </Link>
        <Link className="bigcard" to="/ai">
          <h3>🤖 AI feasibility portal</h3>
          <p>PM tool on top: change request → code-scan feasibility → PDN → Jira stories → test cases.</p>
        </Link>
      </div>
      <p className="hint">Architecture: journey-app (React) → core-policy-system API (rules, rating, proposals, payments) · ai-service scans both codebases.</p>
    </div>
  );
}

export default function App() {
  return (
    <>
      <nav className="topnav">
        <Link to="/" className="brand">elevate<span className="accent">demo</span></Link>
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
