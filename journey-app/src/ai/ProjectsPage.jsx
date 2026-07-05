// Projects (list) — browse/create initiatives that group BRDs, research
// notes and reference files.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadWS, saveWS, uid, now } from './workspace';

export default function ProjectsPage() {
  const nav = useNavigate();
  const [ws, setWs] = useState(loadWS);
  const [name, setName] = useState('');
  const write = (next) => setWs(saveWS(next));

  const addProject = () => {
    if (!name.trim()) return;
    const p = { id: uid(), name: name.trim(), about: '', files: [], createdAt: now(), brds: [] };
    write({ ...ws, projects: [p, ...ws.projects] });
    setName('');
  };

  const cards = ws.projects.map((p) => ({
    ...p,
    draftCount: p.brds.filter((b) => b.status === 'draft').length,
    lockedCount: p.brds.filter((b) => b.status === 'locked').length,
    generatedCount: p.brds.filter((b) => b.status === 'generated').length
  }));

  return (
    <div>
      <h1 className="dashh1sm">Projects</h1>
      <p className="dashsub" style={{ marginBottom: 22 }}>One folder per initiative — BRDs, research and reference files together.</p>

      <div className="bookadd" style={{ marginBottom: 24 }}>
        <input value={name} placeholder="New project name…" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addProject()} />
        <button className="btn" style={{ marginTop: 0 }} onClick={addProject}>+ Project</button>
      </div>

      <div className="projectgrid">
        {cards.map((p) => (
          <button className="projcard" key={p.id} onClick={() => nav(p.id)}>
            <span className="projcardtitle">📁 {p.name}</span>
            <span className="projcardabout">{p.about}</span>
            <span className="projcardpills">
              <span className="pillmini muted">⚪ {p.draftCount} draft</span>
              <span className="pillmini amber">🔒 {p.lockedCount} locked</span>
              <span className="pillmini green">✓ {p.generatedCount} generated</span>
            </span>
          </button>
        ))}
      </div>
      {!cards.length && <p className="hint">No projects yet — create one above.</p>}
    </div>
  );
}
