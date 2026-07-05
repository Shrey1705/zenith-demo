// Feasly workspace pages. FeasibilityPage runs analyses against the live
// ai-service (which scans the ACTUAL Zenith source); PDN/Stories/Tests show
// the artifacts of the last analysis; Systems and API pages carry the
// plug-and-play integration story.
import React, { useState } from 'react';
import { ai } from '../lib/api';

// ---- Connected Systems (the plug-and-play story) ----
const CONNECTORS = [
  {
    name: 'zenith-core-service', kind: 'Core policy system', lang: 'Node · Express',
    files: ['rules/premium.rules.yaml', 'rules/underwriting.rules.yaml', 'db/schema.sql', 'api/contracts/proposal-v2.contract.json', 'services/*.js']
  },
  {
    name: 'zenith-journey-app', kind: 'Frontend application', lang: 'React · Vite',
    files: ['journey/steps.jsx', 'lib/validation.js', 'pay/PayLink.jsx']
  }
];
const EVENTS = [
  { t: '2 min ago', e: 'analysis.completed', d: 'verdict=red · 5/5 evidence resolved' },
  { t: '1 hr ago', e: 'graph.reindexed', d: 'push to zenith-core-service (rules changed)' },
  { t: '3 hrs ago', e: 'webhook.delivered', d: 'PDN pushed to Jira (PROD board)' },
  { t: '1 day ago', e: 'graph.reindexed', d: 'push to zenith-journey-app (steps.jsx)' }
];

export function SystemsPage() {
  return (
    <div>
      <h2>Connected Systems</h2>
      <p className="hint">Read-only repo connectors. Every push re-indexes the dependency graph the verdicts are grounded in. <span className="tagwarn">Simulated for demo</span></p>
      {CONNECTORS.map((c) => (
        <div className="connector" key={c.name}>
          <div>
            <h4>🔌 {c.name}</h4>
            <p className="hint">{c.kind} · {c.lang}</p>
            <p className="hint">Indexed: {c.files.join(' · ')}</p>
          </div>
          <div className="connector-status">
            <span className="status issued">CONNECTED</span>
            <span className="hint">read-only · webhook active</span>
          </div>
        </div>
      ))}
      <h3 style={{ marginTop: 26, fontFamily: 'var(--font-body)', fontSize: 15 }}>Recent events</h3>
      <table className="dashtable" style={{ marginTop: 10 }}>
        <thead><tr><th>When</th><th>Event</th><th>Detail</th></tr></thead>
        <tbody>
          {EVENTS.map((ev, i) => (
            <tr key={i}><td>{ev.t}</td><td><code>{ev.e}</code></td><td>{ev.d}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- API & Webhooks (real, working key against the live service) ----
export function ApiKeysPage() {
  const [key, setKey] = useState('');
  const [copied, setCopied] = useState('');
  const origin = window.location.origin;

  const generate = async () => {
    const r = await ai.login('pm', 'zenith@123');   // demo key = a real bearer token
    setKey(r.token);
  };
  const copy = (label, s) => { navigator.clipboard.writeText(s); setCopied(label); setTimeout(() => setCopied(''), 1500); };

  const curl = `curl -X POST ${origin}/api/ai/analyze \\
  -H "Authorization: Bearer ${key || '<YOUR_API_KEY>'}" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Offer monthly premium payment EMI"}'`;

  const sdk = `npm install @feasly/sdk

import Feasly from '@feasly/sdk';
const feasly = new Feasly({ apiKey: process.env.FEASLY_API_KEY });

const verdict = await feasly.analyze('Make nominee details mandatory');
console.log(verdict.overall, verdict.effort_points, verdict.impacts);`;

  const webhook = `POST https://yourapp.com/webhooks/feasly
{
  "event": "analysis.completed",
  "verdict": "r",
  "effort_points": 13,
  "evidence_resolved": "5/5",
  "pdn_url": "${origin}/ai/pdn"
}`;

  return (
    <div>
      <h2>API &amp; Webhooks</h2>
      <p className="hint">Feasly is API-first: everything the workspace does is available over REST. This demo key is real — the curl below works from your terminal, right now.</p>

      <h3 className="ws-h3">1 · Get a key</h3>
      {key
        ? <div className="keybox"><code>{key}</code><button className="btn ghost" onClick={() => copy('key', key)}>{copied === 'key' ? 'Copied ✓' : 'Copy'}</button></div>
        : <button className="btn gold" onClick={generate}>Generate demo API key</button>}

      <h3 className="ws-h3">2 · Call the API</h3>
      <div className="codeblock">
        <button className="linkbtn copybtn" onClick={() => copy('curl', curl)}>{copied === 'curl' ? 'Copied ✓' : 'Copy'}</button>
        <pre>{curl}</pre>
      </div>

      <h3 className="ws-h3">3 · Or use the SDK</h3>
      <div className="codeblock">
        <button className="linkbtn copybtn" onClick={() => copy('sdk', sdk)}>{copied === 'sdk' ? 'Copied ✓' : 'Copy'}</button>
        <pre>{sdk}</pre>
      </div>
      <p className="hint">The SDK is a thin wrapper over the REST API — package shown for illustration in this demo.</p>

      <h3 className="ws-h3">4 · Webhooks</h3>
      <p className="hint">Subscribe your tools to analysis events — push PDNs into Jira or Slack the moment a verdict lands.</p>
      <div className="codeblock"><pre>{webhook}</pre></div>
    </div>
  );
}
