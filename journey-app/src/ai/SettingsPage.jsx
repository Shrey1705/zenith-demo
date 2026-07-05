// Settings — connected systems, model routing and API access in one tabbed
// screen. Connectors are the ground truth behind every verdict and PDN.
import React, { useState } from 'react';
import { ai } from '../lib/api';
import { useWS, mutate, uid } from './workspace';

const TABS = ['Connected Systems', 'Model Hub', 'API & Webhooks'];

const CONNECTORS = [
  { name: 'zenith-core-service', kind: 'Core policy system', lang: 'Node · Express', files: ['rules/premium.rules.yaml', 'rules/underwriting.rules.yaml', 'db/schema.sql', 'api/contracts/proposal-v2.contract.json', 'services/*.js'] },
  { name: 'zenith-journey-app', kind: 'Frontend application', lang: 'React · Vite', files: ['journey/steps.jsx', 'lib/validation.js', 'pay/PayLink.jsx'] }
];
const EVENTS = [
  { t: '12 min ago', e: 'analysis.completed', d: 'verdict=red · 3/5 evidence resolved' },
  { t: '1 hr ago', e: 'graph.reindexed', d: 'push to zenith-core-service (rules changed)' },
  { t: '3 hrs ago', e: 'webhook.delivered', d: 'PDN pushed to Jira (PROD board)' }
];

function SystemsTab() {
  return (
    <div>
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
      <h3 className="ws-h3">Recent events</h3>
      <table className="dashtable">
        <thead><tr><th>When</th><th>Event</th><th>Detail</th></tr></thead>
        <tbody>
          {EVENTS.map((ev, i) => <tr key={i}><td>{ev.t}</td><td><code>{ev.e}</code></td><td>{ev.d}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

function ModelsTab() {
  const ws = useWS();
  const models = ws.models || [];
  const [local, setLocal] = useState({ name: '', endpoint: 'http://localhost:11434' });
  const [cloud, setCloud] = useState({ provider: 'anthropic', name: '', key: '' });
  const [tested, setTested] = useState({});

  const addLocal = () => {
    if (!local.name.trim()) return;
    mutate((w) => ({ ...w, models: [...(w.models || []), { id: uid(), name: local.name.trim(), provider: 'local', endpoint: local.endpoint }] }));
    setLocal({ name: '', endpoint: 'http://localhost:11434' });
  };
  const addCloud = () => {
    if (!cloud.name.trim() || cloud.key.length < 8) return;
    mutate((w) => ({ ...w, models: [...(w.models || []), { id: uid(), name: cloud.name.trim(), provider: cloud.provider, keyMasked: '••••' + cloud.key.slice(-4) }] }));
    setCloud({ provider: 'anthropic', name: '', key: '' });
  };
  const remove = (id) => mutate((w) => ({ ...w, models: (w.models || []).filter((m) => m.id !== id), activeModelId: w.activeModelId === id ? null : w.activeModelId }));
  const setActive = (id) => mutate((w) => ({ ...w, activeModelId: id }));

  return (
    <div>
      <h3 className="ws-h3" style={{ marginTop: 0 }}>Active model</h3>
      <div className="modelgrid">
        <button className={'modelcard' + (!ws.activeModelId ? ' on' : '')} onClick={() => setActive(null)}>
          <b>🔒 Feasly demo brain</b>
          <small>Offline · deterministic · code-grounded feasibility</small>
          {!ws.activeModelId && <span className="status issued">ACTIVE</span>}
        </button>
        {models.map((m) => (
          <div key={m.id} className={'modelcard' + (ws.activeModelId === m.id ? ' on' : '')}>
            <b>{m.provider === 'local' ? '💻' : '☁️'} {m.name}</b>
            <small>{m.provider === 'local' ? `Local · ${m.endpoint}` : `${m.provider} · key ${m.keyMasked}`}</small>
            <span className="modelops">
              {ws.activeModelId === m.id
                ? <span className="status issued">ACTIVE</span>
                : <button className="linkbtn" onClick={() => setActive(m.id)}>Set active</button>}
              <button className="linkbtn" onClick={() => setTested((t) => ({ ...t, [m.id]: true }))}>{tested[m.id] ? '✓ Connection OK' : 'Test'}</button>
              <button className="linkbtn" onClick={() => remove(m.id)}>Remove</button>
            </span>
          </div>
        ))}
      </div>

      <div className="modelforms">
        <div>
          <h3 className="ws-h3">💻 Connect a local model</h3>
          <label>Model name</label>
          <input value={local.name} placeholder="e.g. llama3 on my Mac" onChange={(e) => setLocal({ ...local, name: e.target.value })} />
          <label>Endpoint</label>
          <input value={local.endpoint} onChange={(e) => setLocal({ ...local, endpoint: e.target.value })} />
          <button className="btn" onClick={addLocal}>Add local model</button>
        </div>
        <div>
          <h3 className="ws-h3">☁️ Connect a cloud API key</h3>
          <label>Provider</label>
          <select value={cloud.provider} onChange={(e) => setCloud({ ...cloud, provider: e.target.value })}>
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
          </select>
          <label>Display name</label>
          <input value={cloud.name} placeholder="e.g. Claude via my key" onChange={(e) => setCloud({ ...cloud, name: e.target.value })} />
          <label>API key</label>
          <input type="password" value={cloud.key} placeholder="sk-…" onChange={(e) => setCloud({ ...cloud, key: e.target.value })} />
          <button className="btn" onClick={addCloud}>Add cloud model</button>
        </div>
      </div>
    </div>
  );
}

function ApiTab() {
  const [key, setKey] = useState('');
  const [copied, setCopied] = useState('');
  const origin = window.location.origin;
  const generate = async () => { const r = await ai.login('pm', 'zenith@123'); setKey(r.token); };
  const copy = (label, s) => { navigator.clipboard.writeText(s); setCopied(label); setTimeout(() => setCopied(''), 1500); };
  const curl = `curl -X POST ${origin}/api/ai/analyze \\
  -H "Authorization: Bearer ${key || '<YOUR_API_KEY>'}" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Offer monthly premium payment EMI"}'`;

  return (
    <div>
      <p className="hint" style={{ marginBottom: 16 }}>Feasly is API-first — everything the workspace does is available over REST. This demo key is real — the curl below works from your terminal, right now.</p>
      {key
        ? <div className="keybox"><code>{key}</code><button className="btn ghost" onClick={() => copy('key', key)}>{copied === 'key' ? 'Copied ✓' : 'Copy'}</button></div>
        : <button className="btn gold" onClick={generate}>Generate demo API key</button>}
      <h3 className="ws-h3">Call the API</h3>
      <div className="codeblock">
        <button className="linkbtn copybtn" onClick={() => copy('curl', curl)}>{copied === 'curl' ? 'Copied ✓' : 'Copy'}</button>
        <pre>{curl}</pre>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState('Connected Systems');
  const ICON = { 'Connected Systems': '🔌', 'Model Hub': '🧠', 'API & Webhooks': '🔑' };
  return (
    <div className="docwrap">
      <h1 className="doch1">Settings</h1>
      <p className="docsub">Connected systems, model routing and API access.</p>
      <div className="undertabs">
        {TABS.map((t) => <button key={t} className={'undertab' + (tab === t ? ' on' : '')} onClick={() => setTab(t)}>{ICON[t]} {t}</button>)}
      </div>
      {tab === 'Connected Systems' && <SystemsTab />}
      {tab === 'Model Hub' && <ModelsTab />}
      {tab === 'API & Webhooks' && <ApiTab />}
    </div>
  );
}
