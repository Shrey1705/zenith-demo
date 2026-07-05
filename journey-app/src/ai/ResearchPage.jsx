// Research — research chats (via ChatsPage in research mode) plus Books:
// named collections of research chats that can be linked to a project.
import React, { useState } from 'react';
import ChatsPage from './ChatsPage';
import { loadWS, saveWS, uid, now } from './workspace';

export default function ResearchPage() {
  const [ws, setWs] = useState(loadWS);
  const [title, setTitle] = useState('');
  const write = (next) => setWs(saveWS(next));

  const addBook = () => {
    if (!title.trim()) return;
    write({ ...ws, books: [{ id: uid(), title: title.trim(), projectId: null, createdAt: now() }, ...ws.books] });
    setTitle('');
  };
  const patchBook = (id, patch) => write({ ...ws, books: ws.books.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  const removeBook = (id) => write({
    ...ws,
    books: ws.books.filter((b) => b.id !== id),
    chats: ws.chats.map((c) => (c.bookId === id ? { ...c, bookId: null } : c))
  });

  return (
    <div>
      <div className="bookbar">
        <h3 className="ws-h3" style={{ margin: 0 }}>Books — bundle research chats, link them to projects</h3>
        <span className="bookadd">
          <input value={title} placeholder="New book title…" onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addBook()} />
          <button className="btn" style={{ marginTop: 0 }} onClick={addBook}>+ Book</button>
        </span>
      </div>
      {ws.books.length > 0 && (
        <div className="bookgrid">
          {ws.books.map((b) => {
            const count = ws.chats.filter((c) => c.bookId === b.id).length;
            return (
              <div className="bookcard" key={b.id}>
                <b>📕 {b.title}</b>
                <small>{count} research chat{count === 1 ? '' : 's'}</small>
                <select value={b.projectId || ''} onChange={(e) => patchBook(b.id, { projectId: e.target.value || null })}>
                  <option value="">Link to project…</option>
                  {ws.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button className="linkbtn" onClick={() => removeBook(b.id)}>Delete book</button>
              </div>
            );
          })}
        </div>
      )}
      <ChatsPage kind="research" />
    </div>
  );
}
