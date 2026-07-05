// Projects — folders that gather chats, research books and reference files
// around one initiative. Files are stored as metadata (demo).
import React, { useState } from 'react';
import { loadWS, saveWS, uid, now } from './workspace';

export default function ProjectsPage() {
  const [ws, setWs] = useState(loadWS);
  const [openId, setOpenId] = useState(null);
  const [name, setName] = useState('');
  const write = (next) => setWs(saveWS(next));

  const addProject = () => {
    if (!name.trim()) return;
    const p = { id: uid(), name: name.trim(), about: '', files: [], createdAt: now() };
    write({ ...ws, projects: [p, ...ws.projects] });
    setName(''); setOpenId(p.id);
  };
  const patchProject = (id, patch) => write({ ...ws, projects: ws.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const removeProject = (id) => {
    write({
      ...ws,
      projects: ws.projects.filter((p) => p.id !== id),
      chats: ws.chats.map((c) => (c.projectId === id ? { ...c, projectId: null } : c)),
      books: ws.books.map((b) => (b.projectId === id ? { ...b, projectId: null } : b))
    });
    setOpenId(null);
  };
  const addFiles = (id, fileList) => {
    const files = Array.from(fileList).map((f) => ({ name: f.name, size: f.size, addedAt: now() }));
    const p = ws.projects.find((x) => x.id === id);
    patchProject(id, { files: [...p.files, ...files] });
  };

  const open = ws.projects.find((p) => p.id === openId);

  if (open) {
    const chats = ws.chats.filter((c) => c.projectId === open.id && c.kind === 'chat');
    const research = ws.chats.filter((c) => c.projectId === open.id && c.kind === 'research');
    const books = ws.books.filter((b) => b.projectId === open.id);
    return (
      <div>
        <button className="linkbtn" onClick={() => setOpenId(null)}>← All projects</button>
        <h2>📁 {open.name}</h2>
        <label>About this project</label>
        <textarea rows={2} value={open.about} placeholder="What is this initiative about?" onChange={(e) => patchProject(open.id, { about: e.target.value })} />

        <div className="projcols">
          <div className="projcol">
            <h3 className="ws-h3">💬 Chats ({chats.length})</h3>
            {chats.map((c) => <p key={c.id} className="projitem">{c.title}</p>)}
            {!chats.length && <p className="hint">Assign a chat to this project from the Chats page.</p>}
          </div>
          <div className="projcol">
            <h3 className="ws-h3">🔭 Research ({research.length}) · 📕 Books ({books.length})</h3>
            {books.map((b) => <p key={b.id} className="projitem">📕 {b.title} ({ws.chats.filter((c) => c.bookId === b.id).length} chats)</p>)}
            {research.map((c) => <p key={c.id} className="projitem">{c.title}</p>)}
            {!research.length && !books.length && <p className="hint">Link research chats or books from the Research page.</p>}
          </div>
          <div className="projcol">
            <h3 className="ws-h3">📎 Reference files ({open.files.length})</h3>
            {open.files.map((f, i) => <p key={i} className="projitem">{f.name} <small className="hint" style={{ display: 'inline' }}>({Math.max(1, Math.round(f.size / 1024))} KB)</small></p>)}
            <label className="filebtn">
              + Add files<input type="file" multiple style={{ display: 'none' }} onChange={(e) => addFiles(open.id, e.target.files)} />
            </label>
          </div>
        </div>
        <button className="linkbtn" onClick={() => removeProject(open.id)}>Delete project</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Projects</h2>
      <p className="hint">One folder per initiative — chats, research and reference files in one place.</p>
      <div className="bookadd" style={{ marginBottom: 16 }}>
        <input value={name} placeholder="New project name…" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addProject()} />
        <button className="btn" style={{ marginTop: 0 }} onClick={addProject}>+ Project</button>
      </div>
      <div className="bookgrid">
        {ws.projects.map((p) => {
          const nChats = ws.chats.filter((c) => c.projectId === p.id).length;
          const nBooks = ws.books.filter((b) => b.projectId === p.id).length;
          return (
            <button className="bookcard proj" key={p.id} onClick={() => setOpenId(p.id)}>
              <b>📁 {p.name}</b>
              <small>{nChats} chats · {nBooks} books · {p.files.length} files</small>
              {p.about && <small className="projabout">{p.about.slice(0, 80)}</small>}
            </button>
          );
        })}
      </div>
      {!ws.projects.length && <p className="hint">No projects yet — create one above.</p>}
    </div>
  );
}
