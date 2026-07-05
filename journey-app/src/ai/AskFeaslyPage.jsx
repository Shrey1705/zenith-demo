// Ask Feasly — general code-grounded feasibility Q&A, with persistent chat
// history. Separate from BRD authoring (that lives in the BRD Assistant).
import React, { useState, useRef, useEffect } from 'react';
import { ai } from '../lib/api';
import { useWorkspace } from './AiPortal';
import { loadWS, saveWS, uid, now, activeModelLabel } from './workspace';

const GREETING = {
  role: 'assistant',
  content: `Hi! I'm your Feasly copilot, connected to the Zenith Health tenant.

Ask me a feasibility question — "can we offer monthly EMI payments?" — and I'll answer from the actual codebase, with evidence. I can also draft PRD skeletons, prioritize with RICE, shape roadmaps, and write standup templates.`,
  engine: 'deterministic'
};

export default function AskFeaslyPage() {
  const { token } = useWorkspace();
  const [ws, setWs] = useState(loadWS);
  const [activeId, setActiveId] = useState(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const endRef = useRef(null);

  const chats = ws.chats.filter((c) => c.kind === 'chat').sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const active = ws.chats.find((c) => c.id === activeId) || chats[0] || null;
  const write = (next) => setWs(saveWS(next));

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [active?.messages?.length, busy]);

  const newChat = () => {
    const c = { id: uid(), title: 'New chat', kind: 'chat', projectId: null, messages: [GREETING], createdAt: now(), updatedAt: now() };
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
      chat = { id: uid(), title: 'New chat', kind: 'chat', projectId: null, messages: [GREETING], createdAt: now(), updatedAt: now() };
      write({ ...ws, chats: [chat, ...ws.chats] });
      setActiveId(chat.id);
    }
    const msgs = [...chat.messages, { role: 'user', content: q }];
    const title = chat.title === 'New chat' ? q.slice(0, 42) : chat.title;
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
      <h1 className="dashh1sm">Ask Feasly</h1>
      <p className="dashsub" style={{ marginBottom: 16 }}>Code-grounded feasibility Q&amp;A · <code>{activeModelLabel(ws)}</code></p>

      <div className="wschats">
        <aside className="chatlist">
          <button className="btn" style={{ width: '100%', marginTop: 0 }} onClick={newChat}>+ New chat</button>
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
            </div>
          ))}
          {!chats.length && <p className="hint">No chats yet.</p>}
        </aside>

        <div className="chatmain">
          <div className="chatlog">
            {(active?.messages || [GREETING]).map((m, i) => (
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
              value={input} placeholder="Ask anything — feasibility questions get code-grounded answers…"
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
