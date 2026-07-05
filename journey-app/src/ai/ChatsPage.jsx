// Copilot chats with persistent history — new chat, rename, delete, assign
// to a project. The same component powers Research (kind='research'), where
// chats can additionally be grouped into books.
import React, { useState, useRef, useEffect } from 'react';
import { ai } from '../lib/api';
import { useWorkspace } from './AiPortal';
import { loadWS, saveWS, uid, now, activeModelLabel } from './workspace';

const GREETING = (kind) => ({
  role: 'assistant',
  content: kind === 'research'
    ? 'Research mode. Drop in findings, links, interview notes or questions — everything here can be grouped into a book and linked to a project.'
    : `Hi! I'm your Feasly copilot, connected to the Zenith Health tenant.

Ask me a feasibility question — "can we offer monthly EMI payments?" — and I'll answer from the actual codebase, with evidence. I can also draft PRD skeletons, prioritize with RICE, shape roadmaps, and write standup templates.`,
  engine: 'deterministic'
});

export default function ChatsPage({ kind = 'chat' }) {
  const { token } = useWorkspace();
  const [ws, setWs] = useState(loadWS);
  const [activeId, setActiveId] = useState(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const endRef = useRef(null);

  const chats = ws.chats.filter((c) => c.kind === kind).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const active = ws.chats.find((c) => c.id === activeId) || chats[0] || null;
  const write = (next) => setWs(saveWS(next));

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [active?.messages?.length, busy]);

  const newChat = () => {
    const c = { id: uid(), title: kind === 'research' ? 'New research' : 'New chat', kind, projectId: null, bookId: null, messages: [GREETING(kind)], createdAt: now(), updatedAt: now() };
    write({ ...ws, chats: [c, ...ws.chats] });
    setActiveId(c.id);
  };
  const patchChat = (id, patch) =>
    write({ ...ws, chats: ws.chats.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: now() } : c)) });
  const removeChat = (id) => {
    write({ ...ws, chats: ws.chats.filter((c) => c.id !== id) });
    if (activeId === id) setActiveId(null);
  };

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    let chat = active;
    if (!chat) {
      chat = { id: uid(), title: q.slice(0, 42), kind, projectId: null, bookId: null, messages: [GREETING(kind)], createdAt: now(), updatedAt: now() };
      write({ ...ws, chats: [chat, ...ws.chats] });
      setActiveId(chat.id);
    }
    const msgs = [...chat.messages, { role: 'user', content: q }];
    const title = chat.title.startsWith('New ') ? q.slice(0, 42) : chat.title;
    patchChat(chat.id, { messages: msgs, title });
    setInput(''); setBusy(true);
    try {
      const r = await ai.chat(token, msgs.map(({ role, content }) => ({ role, content })));
      setWs((prev) => saveWS({ ...prev, chats: prev.chats.map((c) => (c.id === chat.id ? { ...c, title, messages: [...msgs, { role: 'assistant', content: r.reply, engine: r.engine }], updatedAt: now() } : c)) }));
    } catch (e) {
      setWs((prev) => saveWS({ ...prev, chats: prev.chats.map((c) => (c.id === chat.id ? { ...c, messages: [...msgs, { role: 'assistant', content: `Something went wrong: ${e.message}`, engine: 'error' }], updatedAt: now() } : c)) }));
    }
    setBusy(false);
  };

  return (
    <div>
      <h2>{kind === 'research' ? 'Research' : 'Copilot Chats'}</h2>
      <p className="hint">Model: <code>{activeModelLabel(ws)}</code> · history saved to this browser</p>

      <div className="wschats">
        <aside className="chatlist">
          <button className="btn" style={{ width: '100%', marginTop: 0 }} onClick={newChat}>+ New {kind === 'research' ? 'research' : 'chat'}</button>
          {chats.map((c) => (
            <div key={c.id} className={'chatitem' + (active?.id === c.id ? ' on' : '')} onClick={() => setActiveId(c.id)}>
              {renaming === c.id ? (
                <input
                  autoFocus defaultValue={c.title}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => { if (e.key === 'Enter') { patchChat(c.id, { title: e.target.value || c.title }); setRenaming(null); } }}
                  onBlur={(e) => { patchChat(c.id, { title: e.target.value || c.title }); setRenaming(null); }}
                />
              ) : (
                <>
                  <span className="chattitle">{c.title}</span>
                  <span className="chatops">
                    <button title="Rename" onClick={(e) => { e.stopPropagation(); setRenaming(c.id); }}>✎</button>
                    <button title="Delete" onClick={(e) => { e.stopPropagation(); removeChat(c.id); }}>🗑</button>
                  </span>
                </>
              )}
              {c.projectId && <span className="chattag">📁 {ws.projects.find((p) => p.id === c.projectId)?.name || 'project'}</span>}
              {c.bookId && <span className="chattag">📕 {ws.books.find((b) => b.id === c.bookId)?.title || 'book'}</span>}
            </div>
          ))}
          {!chats.length && <p className="hint">No {kind === 'research' ? 'research chats' : 'chats'} yet.</p>}
        </aside>

        <div className="chatmain">
          {active && (
            <div className="chatassign">
              <label style={{ margin: 0 }}>Project</label>
              <select value={active.projectId || ''} onChange={(e) => patchChat(active.id, { projectId: e.target.value || null })}>
                <option value="">— none —</option>
                {ws.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {kind === 'research' && (
                <>
                  <label style={{ margin: 0 }}>Book</label>
                  <select value={active.bookId || ''} onChange={(e) => patchChat(active.id, { bookId: e.target.value || null })}>
                    <option value="">— none —</option>
                    {ws.books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                  </select>
                </>
              )}
            </div>
          )}

          <div className="chatlog">
            {(active?.messages || [GREETING(kind)]).map((m, i) => (
              <div key={i} className={'chatmsg ' + m.role}>
                <div className="chatbubble">
                  {m.content}
                  {m.role === 'assistant' && m.engine && m.engine !== 'error' && (
                    <div className="chatengine">{m.engine === 'llm' ? '⚡ live LLM' : '🔒 offline demo brain'}</div>
                  )}
                </div>
              </div>
            ))}
            {busy && <div className="chatmsg assistant"><div className="chatbubble">Thinking…</div></div>}
            <div ref={endRef} />
          </div>

          <div className="chatinput">
            <input
              value={input} placeholder={kind === 'research' ? 'Add a finding, question or note…' : 'Ask anything — feasibility questions get code-grounded answers…'}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button className="btn" disabled={busy} onClick={send}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
