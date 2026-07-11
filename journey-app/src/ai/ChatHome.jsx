// The workspace landing — a chat, not a dashboard. Ask anything about the
// connected tenant; the thread persists, answers can be promoted into a
// project's research, and a documents rail keeps uploads one drag away.
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from './AiPortal';
import { askFeasly } from './brain';
import { I, TypeIcon } from './icons';
import { useWS, mutate, uid, now, titleFrom, TYPES, ROUTE_OF, activeModelLabel, shortDate } from './workspace';

const SUGGESTIONS = [
  'Can we support monthly EMI payments today?',
  'What are the underwriting limits for a ₹2 crore cover?',
  'Which systems does the premium calculation touch?'
];

export default function ChatHome() {
  const nav = useNavigate();
  const ws = useWS();
  const { token } = useWorkspace();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  const chat = ws.homeChat || { messages: [] };
  const msgs = chat.messages || [];
  // Home chat grounds on the most recently touched project.
  const proj = ws.projects[0] || null;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  useEffect(() => { if (msgs.length) endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length, busy]);

  const setMsgs = (m) => mutate((w) => ({ ...w, homeChat: { messages: m } }));

  const send = async (q0) => {
    const q = (q0 ?? input).trim();
    if (!q || busy) return;
    const next = [...msgs, { role: 'user', content: q }];
    setMsgs(next); setInput(''); setBusy(true);
    try {
      const r = await askFeasly({ token, ws, project: proj, messages: next });
      setMsgs([...next, { role: 'assistant', content: r.reply, engine: r.engine, sources: r.sources || undefined }]);
    } catch (e) {
      setMsgs([...next, { role: 'assistant', content: `Something went wrong: ${e.message}`, engine: 'error' }]);
    }
    setBusy(false);
  };

  const saveToResearch = (i) => {
    if (!proj) return;
    const m = msgs[i];
    const q = msgs[i - 1]?.content || 'AI answer';
    const doc = { id: uid(), title: titleFrom(q), source: 'ai', createdAt: now(), content: 'Saved from the workspace chat.\n\nQ: ' + q + '\n\n' + m.content };
    mutate((w) => ({
      ...w,
      homeChat: { messages: w.homeChat.messages.map((x, j) => (j === i ? { ...x, savedAsResearchId: doc.id, savedIn: proj.id } : x)) },
      projects: w.projects.map((p) => (p.id === proj.id ? { ...p, research: [doc, ...p.research] } : p))
    }));
  };

  const upload = (files) => {
    const f = files?.[0];
    if (!f || !proj) return;
    const doc = { id: uid(), title: f.name.replace(/\.[a-z0-9]+$/i, ''), source: 'upload', sourceDetail: f.name, createdAt: now(), content: `Uploaded file: ${f.name} (${Math.max(1, Math.round(f.size / 1024))} KB).\n\nAdd your read-out here — key quotes, numbers and decisions worth carrying into a BRD.` };
    mutate((w) => ({ ...w, projects: w.projects.map((p) => (p.id === proj.id ? { ...p, research: [doc, ...p.research] } : p)) }));
  };

  const recentDocs = ws.projects.flatMap((p) =>
    Object.keys(TYPES).flatMap((t) => (p[TYPES[t].key] || []).map((d) => ({ p, t, d })))
  ).sort((a, b) => (b.d.createdAt || '').localeCompare(a.d.createdAt || '')).slice(0, 8);

  const composer = (
    <div className="fs-composer">
      <textarea rows={1} value={input} placeholder={proj ? `Ask about ${proj.name}, the codebase, contracts…` : 'Ask about the connected tenant…'}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
      <button className="fs-send" disabled={busy || !input.trim()} onClick={() => send()} aria-label="Send"><I n="send" s={15} sw={2} /></button>
    </div>
  );

  return (
    <div className="fs-home">
      <div className="fs-chatcol">
        {msgs.length === 0 ? (
          <div className="fs-hero">
            <div className="fs-heromark"><I n="sparkle" s={30} /></div>
            <h1>Good {greet}. What are we building?</h1>
            <p>I'm connected to the Zenith tenant — its code, contracts and every document in this workspace. Answers are grounded, cited, and one click from becoming research.</p>
            {composer}
            <div className="fs-chips">
              {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}
            </div>
          </div>
        ) : (
          <>
            <div className="fs-thread">
              {msgs.map((m, i) => (
                <div key={i} className={'fs-msg ' + m.role}>
                  {m.role === 'assistant' && <span className="fs-msgmark"><I n="sparkle" s={13} /></span>}
                  <div className="fs-msgbody">
                    {m.content}
                    {m.sources?.length > 0 && (
                      <div className="srcchips">
                        <span className="srclbl">Grounded on</span>
                        {m.sources.map((sc, j) => <span key={j} className="srcchip"><TypeIcon type={sc.type} s={11} /> {sc.title}</span>)}
                      </div>
                    )}
                    {m.role === 'assistant' && m.engine === 'local' && <div className="chatengine"><I n="cpu" s={11} /> {activeModelLabel(ws)}</div>}
                    {m.role === 'assistant' && m.engine !== 'error' && i > 0 && proj && (
                      m.savedAsResearchId
                        ? <button className="convchip" onClick={() => nav(`p/${m.savedIn}/research/${m.savedAsResearchId}`)}>Open in Research →</button>
                        : <button className="convchip ghost" onClick={() => saveToResearch(i)}>Save to Research</button>
                    )}
                  </div>
                </div>
              ))}
              {busy && <div className="fs-msg assistant"><span className="fs-msgmark pulse"><I n="sparkle" s={13} /></span><div className="fs-msgbody dim">Thinking…</div></div>}
              <div ref={endRef} />
            </div>
            <div className="fs-composerdock">
              {composer}
              <p className="fs-ground">Grounded on <b>{proj?.name || 'the Zenith tenant'}</b> · {activeModelLabel(ws)} · <button className="fs-clearchat" onClick={() => setMsgs([])}>Clear chat</button></p>
            </div>
          </>
        )}
      </div>

      <aside className="fs-docsrail">
        <div className="fs-railhead">
          <h3>Documents</h3>
          <label className="fs-uploadbtn" title={proj ? `Upload into ${proj.name}` : 'Create a project first'}>
            <I n="upload" s={13} /> Upload
            <input type="file" style={{ display: 'none' }} disabled={!proj} onChange={(e) => upload(e.target.files)} />
          </label>
        </div>
        <p className="fs-railhint">Uploads land in <b>{proj?.name || '—'}</b> as research.</p>
        <div className="fs-doclist">
          {recentDocs.map(({ p, t, d }) => (
            <button key={t + d.id} onClick={() => nav(`p/${p.id}/${ROUTE_OF[t]}/${d.id}`)}>
              <TypeIcon type={t} s={14} />
              <span className="fs-docmain">
                <span className="fs-doctitle">{d.title}</span>
                <span className="fs-docmeta">{TYPES[t].one} · {p.name}{d.createdAt ? ` · ${shortDate(d.createdAt)}` : ''}</span>
              </span>
            </button>
          ))}
          {!recentDocs.length && <p className="fs-empty">Nothing yet — ask something and save it, or upload a file.</p>}
        </div>
      </aside>
    </div>
  );
}
