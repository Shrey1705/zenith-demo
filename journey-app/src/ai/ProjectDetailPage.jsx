// Project detail — all BRDs for one initiative, plus research notes and
// reference files, in an underline-tab layout.
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { loadWS, saveWS, findProject, newBrd, brdStatusMeta, now } from './workspace';

const TABS = ['BRDs', 'Research', 'Files'];

export default function ProjectDetailPage() {
  const nav = useNavigate();
  const { projectId } = useParams();
  const [ws, setWs] = useState(loadWS);
  const [tab, setTab] = useState('BRDs');
  const [title, setTitle] = useState('');
  const write = (next) => setWs(saveWS(next));

  const project = findProject(ws, projectId);
  if (!project) return <p className="hint">Project not found. <button className="linkbtn" onClick={() => nav('..')}>← All projects</button></p>;

  const addBrd = () => {
    if (!title.trim()) return;
    const brd = newBrd(title.trim());
    write({ ...ws, projects: ws.projects.map((p) => (p.id === projectId ? { ...p, brds: [brd, ...p.brds] } : p)) });
    setTitle('');
    nav(brd.id);
  };
  const addFiles = (fileList) => {
    const files = Array.from(fileList).map((f) => ({ name: f.name, size: f.size, addedAt: now() }));
    write({ ...ws, projects: ws.projects.map((p) => (p.id === projectId ? { ...p, files: [...p.files, ...files] } : p)) });
  };

  const research = ws.chats.filter((c) => c.projectId === projectId && c.kind === 'research');

  return (
    <div>
      <button className="linkbtn" onClick={() => nav('..')}>← All projects</button>
      <h1 className="dashh1sm" style={{ marginTop: 10 }}>📁 {project.name}</h1>
      <p className="dashsub" style={{ maxWidth: 640, marginBottom: 20 }}>{project.about || 'No description yet.'}</p>

      <div className="undertabs">
        {TABS.map((t) => (
          <button key={t} className={'undertab' + (tab === t ? ' on' : '')} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'BRDs' && (
        <div>
          <div className="bookadd" style={{ marginBottom: 18 }}>
            <input value={title} placeholder="New BRD title — e.g. 'Offer quarterly payment option'…" onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addBrd()} />
            <button className="btn" style={{ marginTop: 0 }} onClick={addBrd}>+ New BRD</button>
          </div>
          <div className="dashlist">
            {project.brds.map((b) => {
              const meta = brdStatusMeta(b);
              return (
                <button className="brdrow" key={b.id} onClick={() => nav(b.id)}>
                  <span>
                    <span className="brdrowtitle">{b.title}</span>
                    <span className="brdrowsub">Updated {b.lockedAt || 'recently'}{b.analysis ? ` · ${b.analysis.points} pts` : ''}</span>
                  </span>
                  <span className="statuspill">{meta.emoji} {meta.label}</span>
                </button>
              );
            })}
            {!project.brds.length && <p className="hint">No BRDs yet — create one above.</p>}
          </div>
        </div>
      )}

      {tab === 'Research' && (
        <div className="tabpanel">
          <p className="hint">🔭 Research notes for this project — interview findings, market notes, competitor scans. Link a note from Ask Feasly to see it here.</p>
          {research.length
            ? research.map((c) => <p key={c.id} className="projitem">{c.title}</p>)
            : <p className="hint" style={{ color: '#5b7291' }}>Nothing linked yet.</p>}
        </div>
      )}

      {tab === 'Files' && (
        <div className="tabpanel">
          <p className="hint" style={{ marginBottom: 10 }}>📎 Reference files kept alongside this project's BRDs.</p>
          {project.files.map((f, i) => <p key={i} className="projitem">{f.name} <small className="hint" style={{ display: 'inline' }}>({Math.max(1, Math.round(f.size / 1024))} KB)</small></p>)}
          <label className="filebtn">+ Add files<input type="file" multiple style={{ display: 'none' }} onChange={(e) => addFiles(e.target.files)} /></label>
        </div>
      )}
    </div>
  );
}
