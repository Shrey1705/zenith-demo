// Floating assist panel — AI is always one click away without taking over
// the interface. Binds to the project's most recent conversation; replies
// can be saved straight into Research.
import React, { useState, useRef, useEffect } from 'react';
import { ai } from '../lib/api';
import { useWorkspace } from './AiPortal';
import { mutate, uid, now } from './workspace';

export default function AssistPanel({ project }) {
  const { token } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  const conv = project.conversations[0] || null;
  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [open, conv?.messages?.length, busy]);

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput(''); setBusy(true);
    let convId = conv?.id;
    let msgs = conv ? [...conv.messages, { role: 'user', content: q }] : [{ role: 'user', content: q }];
    mutate((w) => ({
      ...w,
      projects: w.projects.map((p) => {
        if (p.id !== project.id) return p;
        if (convId) return { ...p, conversations: p.conversations.map((c) => c.id === convId ? { ...c, messages: msgs, updatedAt: now() } : c) };
        const c = { id: (convId = uid()), title: q.slice(0, 48), messages: msgs, updatedAt: now() };
        return { ...p, conversations: [c, ...p.conversations] };
      })
    }));
    try {
      const r = await ai.chat(token, msgs.map(({ role, content }) => ({ role, content })));
      msgs = [...msgs, { role: 'assistant', content: r.reply, engine: r.engine }];
    } catch (e) {
      msgs = [...msgs, { role: 'assistant', content: `Something went wrong: ${e.message}`, engine: 'error' }];
    }
    mutate((w) => ({
      ...w,
      projects: w.projects.map((p) => p.id !== project.id ? p : {
        ...p, conversations: p.conversations.map((c) => c.id === convId ? { ...c, messages: msgs, updatedAt: now() } : c)
      })
    }));
    setBusy(false);
  };

  const saveToResearch = (mi) => {
    const m = conv.messages[mi];
    const doc = { id: uid(), title: (conv.title || 'AI answer').slice(0, 60), source: 'ai', createdAt: now(), content: 'Saved from a Feasly conversation.\n\n' + m.content };
    mutate((w) => ({
      ...w,
      projects: w.projects.map((p) => p.id !== project.id ? p : {
        ...p,
        research: [doc, ...p.research],
        conversations: p.conversations.map((c) => c.id === conv.id ? { ...c, messages: c.messages.map((x, j) => j === mi ? { ...x, savedAsResearchId: doc.id } : x) } : c)
      })
    }));
  };

  if (!open) {
    return <button className="assistfab" onClick={() => setOpen(true)}>✦ Ask Feasly</button>;
  }
  return (
    <div className="assistpanel">
      <div className="assisthead">
        <b>✦ Ask Feasly</b>
        <span className="assisthint">{project.name}</span>
        <button onClick={() => setOpen(false)} aria-label="Close">✕</button>
      </div>
      <div className="assistlog">
        {(conv?.messages || [{ role: 'assistant', content: 'Ask anything — I read this tenant\'s code, contracts and docs. Answers can be saved to Research.' }]).map((m, i) => (
          <div key={i} className={'assistmsg ' + m.role}>
            {m.content}
            {m.role === 'assistant' && conv && (
              m.savedAsResearchId
                ? <span className="assistsaved">✓ Saved to Research</span>
                : <button className="assistsave" onClick={() => saveToResearch(i)}>Save to Research</button>
            )}
          </div>
        ))}
        {busy && <div className="assistmsg assistant">Thinking…</div>}
        <div ref={endRef} />
      </div>
      <div className="assistinput">
        <input value={input} placeholder="Ask about this project…" onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
        <button disabled={busy} onClick={send}>Send</button>
      </div>
    </div>
  );
}
