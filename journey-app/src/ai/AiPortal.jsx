// AI feasibility portal — login, analyze change request, view feasibility /
// PDN / Jira stories / test cases. Talks to ai-service, which scans the
// ACTUAL source of core-service and journey-app for evidence.
import React, { useState } from 'react';
import { ai } from '../lib/api';

const SAMPLES = [
  'Allow customers to add parents-in-law as covered members',
  'Make nominee details mandatory in the journey',
  'Show PED waiting period per member on the review screen',
  'Offer monthly premium payment (EMI) instead of annual only',
  'Add a ₹2 crore sum insured band'
];
const DOT = { g: '🟢', a: '🟠', r: '🔴' };

export default function AiPortal() {
  const [token, setToken] = useState(null);
  if (!token) return <Login onToken={setToken} />;
  return <Analyzer token={token} />;
}

function Login({ onToken }) {
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState('');
  const go = async () => {
    try { const r = await ai.login(u, p); onToken(r.token); }
    catch { setErr('Invalid credentials. Demo login: pm / zenith@123'); }
  };
  return (
    <div className="page narrow dark">
      <h2>AI Feasibility Portal</h2>
      <p className="hint">Product-side system feasibility, PDN drafting, stories & test cases — grounded in live code scans.</p>
      <label>Username</label><input value={u} onChange={e => setU(e.target.value)} />
      <label>Password</label><input type="password" value={p} onChange={e => setP(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} />
      {err && <p className="error">{err}</p>}
      <button className="btn" onClick={go}>Login</button>
      <p className="hint">Demo credentials: <code>pm / zenith@123</code></p>
    </div>
  );
}

function Analyzer({ token }) {
  const [text, setText] = useState('');
  const [r, setR] = useState(null);
  const [tab, setTab] = useState('feas');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const run = async (t) => {
    const q = (t || text).trim();
    if (!q) return;
    setText(q); setBusy(true); setErr('');
    try { setR(await ai.analyze(token, q)); setTab('feas'); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const copy = (s) => navigator.clipboard.writeText(s);

  return (
    <div className="page dark">
      <h2>AI Feasibility Portal</h2>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Describe the product change in plain English…" rows={3} />
      <div className="chips">{SAMPLES.map(s => <button key={s} className="chip" onClick={() => run(s)}>{s}</button>)}</div>
      <button className="btn" disabled={busy} onClick={() => run()}>{busy ? 'Scanning core-service & journey-app…' : 'Analyze feasibility'}</button>
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
          <div className="tabs">
            {[['feas', 'Feasibility'], ['pdn', 'PDN draft'], ['stories', `Stories (${r.stories.length})`], ['tests', 'Test cases']].map(([k, l]) =>
              <button key={k} className={'tabbtn ' + (tab === k ? 'on' : '')} onClick={() => setTab(k)}>{l}</button>)}
          </div>

          {tab === 'feas' && (
            <table className="dashtable">
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
          )}

          {tab === 'pdn' && (
            <div>
              <button className="btn ghost" onClick={() => copy(r.pdn_markdown)}>Copy Markdown</button>
              <pre className="mdpre">{r.pdn_markdown}</pre>
            </div>
          )}

          {tab === 'stories' && r.stories.map((s, i) => (
            <div className="story" key={i}>
              <h4>{DOT[s.verdict]} {s.summary}</h4>
              <p className="hint">{s.component} · {s.points} pts</p>
              <p>{s.description}</p>
              <b>Tasks</b><ul>{s.tasks.map((t, j) => <li key={j}>{t}</li>)}</ul>
              <b>Acceptance criteria</b><ul>{s.ac.map((a, j) => <li key={j}>{a}</li>)}</ul>
            </div>
          ))}

          {tab === 'tests' && r.test_suites.map((suite, i) => (
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
        </>
      )}
    </div>
  );
}
