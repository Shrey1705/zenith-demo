// Feasly workspace pages. FeasibilityPage runs analyses against the live
// ai-service (which scans the ACTUAL Zenith source); PDN/Stories/Tests show
// the artifacts of the last analysis; Systems and API pages carry the
// plug-and-play integration story.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ai } from '../lib/api';
import { useWorkspace } from './AiPortal';

const SAMPLES = [
  'Allow customers to add parents-in-law as covered members',
  'Make nominee details mandatory in the journey',
  'Show PED waiting period per member on the review screen',
  'Offer monthly premium payment (EMI) instead of annual only',
  'Add a ₹2 crore sum insured band'
];
const DOT = { g: '🟢', a: '🟠', r: '🔴' };

function EmptyArtifact({ label }) {
  return (
    <div className="emptystate">
      <h3>No {label} yet</h3>
      <p className="hint">Run an analysis in Feasibility Studio first — every artifact here is generated from a real code scan.</p>
      <Link className="btn" to="../feasibility">Open Feasibility Studio →</Link>
    </div>
  );
}

// ---- Feasibility Studio ----
export function FeasibilityPage() {
  const { token, analysis, setAnalysis } = useWorkspace();
  const [text, setText] = useState(analysis?.text || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const r = analysis;

  const run = async (t) => {
    const q = (t || text).trim();
    if (!q) return;
    setText(q); setBusy(true); setErr('');
    try { setAnalysis(await ai.analyze(token, q)); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div>
      <h2>Feasibility Studio</h2>
      <p className="hint">Describe a product change in plain English — the engine scans the connected Zenith codebases and answers with file-and-line evidence.</p>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Describe the product change in plain English…" rows={3} />
      <div className="chips">{SAMPLES.map(s => <button key={s} className="chip" onClick={() => run(s)} data-tour={s.includes('EMI') ? 'ai-sample-emi' : undefined}>{s}</button>)}</div>
      <button className="btn" disabled={busy} onClick={() => run()}>{busy ? 'Scanning connected systems…' : 'Analyze feasibility'}</button>
      {err && <p className="error">{err}</p>}

      {r && !r.matched && (
        <div className="banner a" style={{ marginTop: 18 }}>
          <b>Needs Tech discovery</b>
          <p className="hint">{r.note}</p>
        </div>
      )}

      {r && r.matched && (
        <>
          <div className={'banner ' + r.overall} style={{ marginTop: 18 }}>
            <b>{DOT[r.overall]} {r.verdict_label}</b>
            <p className="hint">Effort {r.effort_points} story points ({r.size}) · {r.sprints} · {r.verified}/{r.impacts.length} impacts verified against source code</p>
          </div>
          <div className="legend">
            <span>{DOT.r} Red — core rules/DB change, needs UW/actuarial sign-off + migration</span>
            <span>{DOT.a} Amber — API contract change, needs versioning + consumer coordination</span>
            <span>{DOT.g} Green — frontend-only, no core dependency</span>
            <span>Story points — Fibonacci scale: S=3 · M=5 · L=8 · XL=13</span>
          </div>

          <table className="dashtable" style={{ marginTop: 14 }}>
            <thead><tr><th></th><th>Component</th><th>System</th><th>Required change</th><th>Code evidence</th></tr></thead>
            <tbody>
              {r.impacts.map((i, k) => (
                <tr key={k}>
                  <td>{DOT[i.v]}</td>
                  <td><code>{i.file.split('/').slice(-2).join('/')}</code></td>
                  <td>{r.layers[i.layer].system}</td>
                  <td>{i.change}</td>
                  <td>{i.evidence
                    ? <code className="evidence">L{i.evidence.line}: {i.evidence.snippet}</code>
                    : <span className="tagwarn">not found — verify manually</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="chips" style={{ marginTop: 16 }}>
            <Link className="chip" to="../pdn">📄 Open PDN draft</Link>
            <Link className="chip" to="../stories">🗂 User stories ({r.stories.length})</Link>
            <Link className="chip" to="../tests">✅ Test cases</Link>
          </div>
        </>
      )}
    </div>
  );
}

// ---- PDN Draft ----
export function PdnPage() {
  const { analysis: r } = useWorkspace();
  if (!r?.matched) return <EmptyArtifact label="PDN draft" />;
  return (
    <div>
      <h2>PDN Draft</h2>
      <p className="hint">Product Development Note for: <i>"{r.text}"</i> — AI-drafted, pending Tech review.</p>
      <button className="btn ghost" onClick={() => navigator.clipboard.writeText(r.pdn_markdown)}>Copy Markdown</button>
      <pre className="mdpre">{r.pdn_markdown}</pre>
    </div>
  );
}

// ---- User Stories ----
export function StoriesPage() {
  const { analysis: r } = useWorkspace();
  if (!r?.matched) return <EmptyArtifact label="stories" />;
  return (
    <div>
      <h2>User Stories</h2>
      <p className="hint">{r.stories.length} Jira-ready stories for: <i>"{r.text}"</i></p>
      {r.stories.map((s, i) => (
        <div className="story" key={i}>
          <h4>{DOT[s.verdict]} {s.summary}</h4>
          <p className="hint">{s.component} · {s.points} pts</p>
          <p>{s.description}</p>
          <b>Tasks</b><ul>{s.tasks.map((t, j) => <li key={j}>{t}</li>)}</ul>
          <b>Acceptance criteria</b><ul>{s.ac.map((a, j) => <li key={j}>{a}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}

// ---- Test Cases ----
export function TestsPage() {
  const { analysis: r } = useWorkspace();
  if (!r?.matched) return <EmptyArtifact label="test cases" />;
  return (
    <div>
      <h2>Test Cases</h2>
      <p className="hint">Gherkin suites per story for: <i>"{r.text}"</i></p>
      {r.test_suites.map((suite, i) => (
        <div className="story" key={i}>
          <h4>{suite.story}</h4>
          {suite.cases.map(c => (
            <div key={c.id} className="testcase">
              <b>{c.id} — {c.title}</b>
              <pre className="gherkin">{c.gherkin}</pre>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

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
