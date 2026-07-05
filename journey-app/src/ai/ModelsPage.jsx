// Model Hub — bring your own brain: connect a locally hosted model (e.g. an
// Ollama endpoint on your machine) or a cloud API key. Keys are masked and
// stay in this browser. The demo routes requests to its offline brain either
// way; the active model label follows you across the workspace.
import React, { useState } from 'react';
import { loadWS, saveWS, uid } from './workspace';

export default function ModelsPage() {
  const [ws, setWs] = useState(loadWS);
  const [local, setLocal] = useState({ name: '', endpoint: 'http://localhost:11434' });
  const [cloud, setCloud] = useState({ provider: 'anthropic', name: '', key: '' });
  const [tested, setTested] = useState({});
  const write = (next) => setWs(saveWS(next));

  const addLocal = () => {
    if (!local.name.trim()) return;
    write({ ...ws, models: [...ws.models, { id: uid(), name: local.name.trim(), provider: 'local', endpoint: local.endpoint }] });
    setLocal({ name: '', endpoint: 'http://localhost:11434' });
  };
  const addCloud = () => {
    if (!cloud.name.trim() || cloud.key.length < 8) return;
    write({ ...ws, models: [...ws.models, { id: uid(), name: cloud.name.trim(), provider: cloud.provider, keyMasked: '••••' + cloud.key.slice(-4) }] });
    setCloud({ provider: 'anthropic', name: '', key: '' });
  };
  const remove = (id) => write({ ...ws, models: ws.models.filter((m) => m.id !== id), activeModelId: ws.activeModelId === id ? null : ws.activeModelId });
  const test = (id) => setTested((t) => ({ ...t, [id]: true }));

  return (
    <div>
      <h2>Model Hub</h2>
      <p className="hint">Route Feasly through your own model — a locally hosted one on your machine, or a cloud API key. Keys never leave this browser. <span className="tagwarn">Routing simulated in demo</span></p>

      <h3 className="ws-h3">Active model</h3>
      <div className="modelgrid">
        <button className={'modelcard' + (!ws.activeModelId ? ' on' : '')} onClick={() => write({ ...ws, activeModelId: null })}>
          <b>🔒 Feasly demo brain</b>
          <small>Offline · deterministic · code-grounded feasibility</small>
          {!ws.activeModelId && <span className="status issued">ACTIVE</span>}
        </button>
        {ws.models.map((m) => (
          <div key={m.id} className={'modelcard' + (ws.activeModelId === m.id ? ' on' : '')}>
            <b>{m.provider === 'local' ? '💻' : '☁️'} {m.name}</b>
            <small>{m.provider === 'local' ? `Local · ${m.endpoint}` : `${m.provider} · key ${m.keyMasked}`}</small>
            <span className="modelops">
              {ws.activeModelId === m.id
                ? <span className="status issued">ACTIVE</span>
                : <button className="linkbtn" onClick={() => write({ ...ws, activeModelId: m.id })}>Set active</button>}
              <button className="linkbtn" onClick={() => test(m.id)}>{tested[m.id] ? '✓ Connection OK' : 'Test'}</button>
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
