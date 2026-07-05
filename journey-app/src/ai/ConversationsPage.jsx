// Conversations — persistent, project-scoped AI threads. Nothing here is
// throwaway: any assistant reply can be promoted into Research, and replies
// that were saved link back to the document they became.
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ai } from '../lib/api';
import { useWorkspace } from './AiPortal';
import { useWS, mutate, uid, now, findProject, shortDate } from './workspace';

export default function ConversationsPage() {
  const { pid, convId } = useParams();
  const nav = useNavigate();
  const ws = useWS();
  const { token } = useWorkspace();
  const project = findProject(ws, pid);
  const conv = convId ? project.conversations.find((c) => c.id === convId) : null;
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conv?.messages?.length, busy]);

  const patchConv = (id, fn) => mutate((w) => ({
    ...w,
    projects: w.projects.map((p) => p.id !== pid ? p : { ...p, conversations: p.conversations.map((c) => (c.id === id ? fn(c) : c)) })
  }));

  const newConv = () => {
    const c = { id: uid(), title: 'New conversation', updatedAt: now(), messages: [{ role: 'assistant', content: "I'm connected to this project's tenant — code, contracts and docs. Ask away; anything useful can be saved to Research.", engine: 'deterministic' }] };
    mutate((w) => ({ ...w, projects: w.projects.map((p) => p.id !== pid ? p : { ...p, conversations: [c, ...p.conversations] }) }));
    nav(`/ai/p/${pid}/conversations/${c.id}`);
  };

  const send = async () => {
    const q = input.trim();
    if (!q || busy || !conv) return;
    const msgs = [...conv.messages, { role: 'user', content: q }];
    patchConv(conv.id, (c) => ({ ...c, messages: msgs, title: c.title === 'New conversation' ? q.slice(0, 48) : c.title, updatedAt: now() }));
    setInput(''); setBusy(true);
    try {
      const r = await ai.chat(token, msgs.map(({ role, content }) => ({ role, content })));
      patchConv(conv.id, (c) => ({ ...c, messages: [...msgs, { role: 'assistant', content: r.reply, engine: r.engine }], updatedAt: now() }));
    } catch (e) {
      patchConv(conv.id, (c) => ({ ...c, messages: [...msgs, { role: 'assistant', content: `Something went wrong: ${e.message}`, engine: 'error' }], updatedAt: now() }));
    }
    setBusy(false);
  };

  const saveToResearch = (mi) => {
    const m = conv.messages[mi];
    const doc = { id: uid(), title: conv.title.slice(0, 60), source: 'ai', createdAt: now(), content: 'Saved from a Feasly conversation.\n\n' + m.content };
    mutate((w) => ({
      ...w,
      projects: w.projects.map((p) => p.id !== pid ? p : {
        ...p,
        research: [doc, ...p.research],
        conversations: p.conversations.map((c) => c.id !== conv.id ? c : { ...c, messages: c.messages.map((x, j) => j === mi ? { ...x, savedAsResearchId: doc.id } : x) })
      })
    }));
  };

  if (!conv) {
    return (
      <div className="docwrap">
        <h1 className="doch1">Conversations</h1>
        <p className="docsub">Persistent AI threads for this project — the thinking that precedes the documents.</p>
        <div className="homeadd" style={{ margin: '18px 0 6px' }}>
          <button onClick={newConv}>+ New conversation</button>
        </div>
        <div className="klist">
          {project.conversations.map((c) => (
            <button key={c.id} className="krow" onClick={() => nav(c.id)}>
              <span className="krowmain">
                <span className="krowtitle">{c.title}</span>
                <span className="krowmeta">
                  {c.messages.length} messages · {shortDate(c.updatedAt)}
                  {c.messages.some((m) => m.savedAsResearchId) && ' · produced research'}
                </span>
              </span>
            </button>
          ))}
          {!project.conversations.length && <p className="railempty">No conversations yet.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="docwrap">
      <button className="linkbtn" onClick={() => nav(`/ai/p/${pid}/conversations`)}>← Conversations</button>
      <h1 className="doch1" style={{ marginTop: 10 }}>{conv.title}</h1>
      <div className="convlog">
        {conv.messages.map((m, i) => (
          <div key={i} className={'convmsg ' + m.role}>
            <div className="convbubble">
              {m.content}
              {m.role === 'assistant' && i > 0 && (
                m.savedAsResearchId
                  ? <button className="convchip" onClick={() => nav(`/ai/p/${pid}/research/${m.savedAsResearchId}`)}>🔍 Open in Research →</button>
                  : <button className="convchip ghost" onClick={() => saveToResearch(i)}>Save to Research</button>
              )}
            </div>
          </div>
        ))}
        {busy && <div className="convmsg assistant"><div className="convbubble">Thinking…</div></div>}
        <div ref={endRef} />
      </div>
      <div className="chatinput">
        <input value={input} placeholder="Ask about the codebase, a contract, a constraint…" onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
        <button className="btn" disabled={busy} onClick={send}>Send</button>
      </div>
    </div>
  );
}
