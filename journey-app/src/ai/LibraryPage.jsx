// Library — the central repository. Every document the project has produced,
// across all artifact types, in one searchable place with GUI folders for
// organizing. Folders are an organizational lens; the traceability chain is
// never affected by where a document is filed.
import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWS, mutate, uid, findProject, TYPES, ROUTE_OF, shortDate } from './workspace';

const ALL_TYPES = Object.keys(TYPES);

const docText = (d) => [
  d.content, d.description, d.gherkin,
  d.sections && `${d.sections.background} ${(d.sections.requirements || []).join(' ')}`,
  (d.ac || []).join(' ')
].filter(Boolean).join(' ');

export default function LibraryPage() {
  const { pid } = useParams();
  const nav = useNavigate();
  const ws = useWS();
  const project = findProject(ws, pid);
  const folders = project.folders || [];
  const [q, setQ] = useState('');
  const [typeF, setTypeF] = useState('all');
  const [folderF, setFolderF] = useState('all');   // 'all' | 'unfiled' | folder id
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(null);  // folder id being renamed

  const patchProject = (fn) => mutate((w) => ({ ...w, projects: w.projects.map((p) => (p.id === pid ? fn(p) : p)) }));

  const addFolder = () => {
    const name = newName.trim();
    if (!name) return;
    patchProject((p) => ({ ...p, folders: [...(p.folders || []), { id: uid(), name }] }));
    setNewName('');
  };
  const renameFolder = (id, name) => patchProject((p) => ({ ...p, folders: p.folders.map((f) => (f.id === id ? { ...f, name } : f)) }));
  const deleteFolder = (id) => {
    // Documents in the folder become unfiled — never deleted.
    patchProject((p) => {
      const next = { ...p, folders: p.folders.filter((f) => f.id !== id) };
      for (const t of ALL_TYPES) next[TYPES[t].key] = p[TYPES[t].key].map((d) => (d.folderId === id ? { ...d, folderId: undefined } : d));
      return next;
    });
    if (folderF === id) setFolderF('all');
  };
  const moveDoc = (type, docId, folderId) => patchProject((p) => ({
    ...p, [TYPES[type].key]: p[TYPES[type].key].map((d) => (d.id === docId ? { ...d, folderId: folderId || undefined } : d))
  }));

  const docs = useMemo(() => {
    const rows = [];
    for (const t of ALL_TYPES) for (const d of project[TYPES[t].key]) rows.push({ type: t, doc: d });
    const needle = q.trim().toLowerCase();
    return rows.filter(({ type, doc }) => {
      if (typeF !== 'all' && type !== typeF) return false;
      if (folderF === 'unfiled' && doc.folderId) return false;
      if (folderF !== 'all' && folderF !== 'unfiled' && doc.folderId !== folderF) return false;
      if (needle && !(`${doc.title} ${docText(doc)}`.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [project, q, typeF, folderF]);

  const countIn = (fid) => ALL_TYPES.reduce((s, t) => s + project[TYPES[t].key].filter((d) => (fid === 'unfiled' ? !d.folderId : d.folderId === fid)).length, 0);
  const total = ALL_TYPES.reduce((s, t) => s + project[TYPES[t].key].length, 0);

  return (
    <div className="docwrap">
      <h1 className="doch1">Library</h1>
      <p className="docsub">Every document this project has produced — {total} across the chain. Search it, or file documents into folders.</p>

      <div className="libpane">
        <aside className="librail">
          <button className={'libfolder' + (folderF === 'all' ? ' on' : '')} onClick={() => setFolderF('all')}>🗄 All documents <em>{total}</em></button>
          {folders.map((f) => (
            <div key={f.id} className={'libfolder' + (folderF === f.id ? ' on' : '')}>
              {renaming === f.id ? (
                <input autoFocus defaultValue={f.name}
                  onBlur={(e) => { renameFolder(f.id, e.target.value.trim() || f.name); setRenaming(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} />
              ) : (
                <>
                  <button className="libfoldername" onClick={() => setFolderF(f.id)}>📁 {f.name} <em>{countIn(f.id)}</em></button>
                  <span className="libfolderops">
                    <button title="Rename" onClick={() => setRenaming(f.id)}>✎</button>
                    <button title="Delete folder (documents stay)" onClick={() => deleteFolder(f.id)}>🗑</button>
                  </span>
                </>
              )}
            </div>
          ))}
          <button className={'libfolder' + (folderF === 'unfiled' ? ' on' : '')} onClick={() => setFolderF('unfiled')}>📂 Unfiled <em>{countIn('unfiled')}</em></button>
          <div className="libnewfolder">
            <input value={newName} placeholder="New folder…" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addFolder()} />
            <button onClick={addFolder}>+</button>
          </div>
        </aside>

        <div className="libmain">
          <div className="libbar">
            <input value={q} placeholder="Search titles and content…" onChange={(e) => setQ(e.target.value)} />
            <select value={typeF} onChange={(e) => setTypeF(e.target.value)}>
              <option value="all">All types</option>
              {ALL_TYPES.map((t) => <option key={t} value={t}>{TYPES[t].label}</option>)}
            </select>
          </div>

          <div className="klist">
            {docs.map(({ type, doc }) => (
              <div key={`${type}:${doc.id}`} className="krow librow">
                <button className="krowmain" onClick={() => nav(`/ai/p/${pid}/${ROUTE_OF[type]}/${doc.id}`)}>
                  <span className="krowtitle">{TYPES[type].icon} {doc.title}</span>
                  <span className="krowmeta">
                    {TYPES[type].one}
                    {doc.createdAt ? ` · ${shortDate(doc.createdAt)}` : ''}
                    {doc.folderId ? ` · 📁 ${folders.find((f) => f.id === doc.folderId)?.name || ''}` : ''}
                  </span>
                </button>
                <select className="libmove" value={doc.folderId || ''} title="Move to folder"
                  onChange={(e) => moveDoc(type, doc.id, e.target.value)}>
                  <option value="">Unfiled</option>
                  {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            ))}
            {!docs.length && <p className="railempty">Nothing matches — try a different search, type or folder.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
