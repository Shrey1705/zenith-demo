// Settings — connected systems, model routing and API access in one tabbed
// screen. Connectors are the ground truth behind every verdict and PDN.
import React, { useState, useEffect } from 'react';
import { ai } from '../lib/api';
import { detectOllama } from '../lib/ollama';
import { clearIndex } from './rag';
import { useWS, mutate, uid, usingLocal } from './workspace';

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
  const local = ws.local || { endpoint: 'http://localhost:11434', chatModel: '', embedModel: '', temperature: 0.1 };
  const [detected, setDetected] = useState(null);   // null = not tried · [] = ollama up, no models · false = unreachable
  const [detecting, setDetecting] = useState(false);
  const [cloud, setCloud] = useState({ provider: 'anthropic', name: '', key: '' });

  const patchLocal = (p) => {
    // Changing the embedding model or endpoint invalidates stored vectors.
    if (p.embedModel !== undefined || p.endpoint !== undefined) clearIndex();
    mutate((w) => ({ ...w, local: { ...(w.local || local), ...p } }));
  };
  const detect = async (endpoint = local.endpoint) => {
    setDetecting(true);
    const models = await detectOllama(endpoint);
    setDetected(models === null ? false : models);
    if (models?.length) {
      const chat = models.filter((m) => !/embed/i.test(m.name));
      const embed = models.filter((m) => /embed/i.test(m.name));
      mutate((w) => {
        const cur = w.local || local;
        return { ...w, local: { ...cur,
          chatModel: chat.some((m) => m.name === cur.chatModel) ? cur.chatModel : (chat[0]?.name || ''),
          embedModel: embed.some((m) => m.name === cur.embedModel) ? cur.embedModel : (embed[0]?.name || '')
        } };
      });
    }
    setDetecting(false);
  };
  useEffect(() => { detect(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  const chatModels = (detected || []).filter((m) => !/embed/i.test(m.name));
  const embedModels = (detected || []).filter((m) => /embed/i.test(m.name));
  const localReady = detected && detected.length > 0 && local.chatModel && local.embedModel;
  const isLocalActive = usingLocal(ws);

  const addCloud = () => {
    if (!cloud.name.trim() || cloud.key.length < 8) return;
    mutate((w) => ({ ...w, models: [...(w.models || []), { id: uid(), name: cloud.name.trim(), provider: cloud.provider, keyMasked: '••••' + cloud.key.slice(-4) }] }));
    setCloud({ provider: 'anthropic', name: '', key: '' });
  };

  return (
    <div>
      <h3 className="ws-h3" style={{ marginTop: 0 }}>Active model</h3>
      <div className="modelgrid">
        <button className={'modelcard' + (!isLocalActive ? ' on' : '')} onClick={() => mutate((w) => ({ ...w, activeModelId: null }))}>
          <b>🔒 Feasly demo brain</b>
          <small>Offline · deterministic · code-grounded feasibility. Works everywhere, zero setup.</small>
          {!isLocalActive && <span className="status issued">ACTIVE</span>}
        </button>
        <div className={'modelcard' + (isLocalActive ? ' on' : '')}>
          <b>🖥 Ollama on this machine</b>
          <small>
            {detected === null && 'Checking for a local Ollama server…'}
            {detected === false && `No Ollama server at ${local.endpoint}. Start it with \`ollama serve\`, then detect again.`}
            {detected && detected.length === 0 && 'Ollama is running but has no models. Try `ollama pull llama3.2` and `ollama pull nomic-embed-text`.'}
            {detected && detected.length > 0 && `${detected.length} model${detected.length > 1 ? 's' : ''} available · real LLM + RAG over this project's documents and code, fully on-device.`}
          </small>
          <span className="modelops">
            {isLocalActive
              ? <span className="status issued">ACTIVE</span>
              : <button className="linkbtn gold" disabled={!localReady} onClick={() => mutate((w) => ({ ...w, activeModelId: 'local' }))}>Set active</button>}
            <button className="linkbtn" disabled={detecting} onClick={() => detect()}>{detecting ? 'Detecting…' : '↻ Detect Ollama'}</button>
          </span>
        </div>
      </div>

      <div className="modelforms">
        <div>
          <h3 className="ws-h3">🖥 Local model configuration</h3>
          <label>Ollama endpoint</label>
          <input value={local.endpoint} onChange={(e) => patchLocal({ endpoint: e.target.value })} onBlur={() => detect()} />
          <label>Chat model (answers questions)</label>
          {chatModels.length > 0 ? (
            <select value={local.chatModel} onChange={(e) => patchLocal({ chatModel: e.target.value })}>
              {chatModels.map((m) => <option key={m.name} value={m.name}>{m.name} · {m.sizeGb} GB</option>)}
            </select>
          ) : <p className="hint">No chat models detected. <code>ollama pull llama3.2</code></p>}
          <label>Embedding model (turns documents into vectors)</label>
          {embedModels.length > 0 ? (
            <select value={local.embedModel} onChange={(e) => patchLocal({ embedModel: e.target.value })}>
              {embedModels.map((m) => <option key={m.name} value={m.name}>{m.name} · {m.sizeGb} GB</option>)}
            </select>
          ) : <p className="hint">No embedding models detected. <code>ollama pull nomic-embed-text</code></p>}
          <label>Temperature — {Number(local.temperature ?? 0.1).toFixed(2)} {Number(local.temperature ?? 0.1) <= 0.2 ? '· factual, minimal hallucination' : Number(local.temperature) <= 0.5 ? '· balanced' : '· creative (not recommended for grounded answers)'}</label>
          <input type="range" min="0" max="1" step="0.05" value={local.temperature ?? 0.1} onChange={(e) => patchLocal({ temperature: Number(e.target.value) })} />
          <p className="hint">Kept low (0.1) so the model sticks to the retrieved documents and code instead of inventing details.</p>
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
          <p className="hint">Cloud keys are stored masked in this demo and not used for routing — local + demo brain are the two live engines.</p>
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
