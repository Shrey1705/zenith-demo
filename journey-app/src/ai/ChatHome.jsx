// The workspace landing — a chat, not a dashboard. Conversations are named
// sessions (auto-titled like Claude/ChatGPT), each with its own attachments,
// and any session can be promoted into a new project — or linked to an
// existing one — so the delivery chain grows straight out of the chat.
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from './AiPortal';
import { askFeasly } from './brain';
import { ollamaChat } from '../lib/ollama';
import { I, TypeIcon } from './icons';
import {
  useWS, mutate, uid, now, titleFrom, findSession, updateSession, findProject,
  usingLocal, activeModelLabel, shortDate
} from './workspace';

const SUGGESTIONS = [
  'Can we support monthly EMI payments today?',
  'What are the underwriting limits for a ₹2 crore cover?',
  'Which systems does the premium calculation touch?'
];

const railState = () => { try { return localStorage.getItem('fs-rail') !== 'closed'; } catch { return true; } };

export default function ChatHome() {
  const nav = useNavigate();
  const ws = useWS();
  const { token } = useWorkspace();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [railOpen, setRailOpen] = useState(railState);
  const [linking, setLinking] = useState(false);
  const endRef = useRef(null);

  const session = findSession(ws, ws.activeSessionId);
  const msgs = session?.messages || [];
  const linked = session?.projectId ? findProject(ws, session.projectId) : null;
  // Grounding context: the linked project wins; otherwise the freshest one.
  const proj = linked || ws.projects[0] || null;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  useEffect(() => { if (msgs.length) endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length, busy]);

  const toggleRail = () => {
    const v = !railOpen; setRailOpen(v);
    try { localStorage.setItem('fs-rail', v ? 'open' : 'closed'); } catch { /* ignore */ }
  };

  // Quietly ask the local model for a Claude-style short title; the
  // heuristic title is already in place, so failures cost nothing.
  const refineTitle = (sid, q) => {
    if (!usingLocal(ws)) return;
    ollamaChat({
      endpoint: ws.local.endpoint, model: ws.local.chatModel, temperature: 0.3,
      messages: [{ role: 'user', content: `Give a 3-6 word title for a conversation that starts with this question. Reply with the title only, no quotes.\n\n${q.slice(0, 400)}` }]
    }).then((t) => {
      const clean = (t || '').trim().replace(/^["']|["'.]$/g, '').slice(0, 60);
      if (clean && clean.length > 2) mutate((w) => updateSession(w, sid, { title: clean }));
    }).catch(() => { /* keep the heuristic title */ });
  };

  const send = async (q0) => {
    const q = (q0 ?? input).trim();
    if (!q || busy) return;
    let sid = session?.id;
    const isNew = !sid;
    const userMsg = { role: 'user', content: q };
    if (isNew) {
      sid = uid();
      const s = { id: sid, title: titleFrom(q), createdAt: now(), updatedAt: now(), messages: [userMsg], attachments: [], projectId: null };
      mutate((w) => ({ ...w, sessions: [s, ...(w.sessions || [])], activeSessionId: sid }));
    } else {
      mutate((w) => updateSession(w, sid, { messages: [...findSession(w, sid).messages, userMsg], updatedAt: now() }));
    }
    setInput(''); setBusy(true);
    if (isNew) refineTitle(sid, q);
    try {
      // Session attachments ride along as extra context for the model.
      const cur = findSession(getSnapshot(), sid) || { messages: [userMsg], attachments: [] };
      const attachCtx = (cur.attachments || []).map((a) => `[Attached: ${a.title}]\n${a.content}`).join('\n---\n').slice(0, 2400);
      const askMsgs = attachCtx
        ? [...cur.messages.slice(0, -1), { role: 'user', content: `${attachCtx}\n\nQuestion: ${q}` }]
        : cur.messages;
      const r = await askFeasly({ token, ws, project: proj, messages: askMsgs });
      mutate((w) => updateSession(w, sid, {
        messages: [...findSession(w, sid).messages, { role: 'assistant', content: r.reply, engine: r.engine, sources: r.sources || undefined }],
        updatedAt: now()
      }));
    } catch (e) {
      mutate((w) => updateSession(w, sid, {
        messages: [...findSession(w, sid).messages, { role: 'assistant', content: `Something went wrong: ${e.message}`, engine: 'error' }],
        updatedAt: now()
      }));
    }
    setBusy(false);
  };
  // mutate() rebuilds the snapshot synchronously; read it back for send().
  const getSnapshot = () => JSON.parse(localStorage.getItem('feasly-workspace-v3'));

  const saveToResearch = (i) => {
    if (!proj) return;
    const m = msgs[i];
    const q = msgs[i - 1]?.content || 'AI answer';
    const doc = { id: uid(), title: titleFrom(q), source: 'ai', createdAt: now(), content: 'Saved from a chat session.\n\nQ: ' + q + '\n\n' + m.content };
    mutate((w) => ({
      ...updateSession(w, session.id, { messages: msgs.map((x, j) => (j === i ? { ...x, savedAsResearchId: doc.id, savedIn: proj.id } : x)) }),
      projects: w.projects.map((p) => (p.id === proj.id ? { ...p, research: [doc, ...p.research] } : p))
    }));
  };

  const upload = (files) => {
    const f = files?.[0];
    if (!f || !session) return;
    const att = { id: uid(), title: f.name.replace(/\.[a-z0-9]+$/i, ''), sourceDetail: f.name, createdAt: now(), content: `Uploaded file: ${f.name} (${Math.max(1, Math.round(f.size / 1024))} KB). Key points to reference in this chat.` };
    mutate((w) => {
      let next = updateSession(w, session.id, { attachments: [att, ...(findSession(w, session.id).attachments || [])] });
      // A linked session mirrors new uploads into the project's research.
      if (session.projectId) {
        next = { ...next, projects: next.projects.map((p) => (p.id === session.projectId ? { ...p, research: [{ ...att, id: uid(), source: 'upload' }, ...p.research] } : p)) };
      }
      return next;
    });
  };
  const removeAttachment = (id) => mutate((w) => updateSession(w, session.id, { attachments: findSession(w, session.id).attachments.filter((a) => a.id !== id) }));

  // Promote = new project seeded from this session; Link = pour this
  // session's knowledge into an existing project. Both leave the chat
  // linked so later saves and uploads land in the right place.
  const linkSession = (pid, projName) => {
    mutate((w) => {
      const s = findSession(w, session.id);
      const research = [
        ...(s.attachments || []).map((a) => ({ id: uid(), title: a.title, source: 'upload', sourceDetail: a.sourceDetail, createdAt: now(), content: a.content })),
        ...s.messages.filter((m) => m.role === 'assistant' && m.engine !== 'error' && !m.savedAsResearchId).slice(-3)
          .map((m, i2, arr) => {
            const qi = s.messages.indexOf(m) - 1;
            const q = s.messages[qi]?.content || s.title;
            return { id: uid(), title: titleFrom(q), source: 'ai', createdAt: now(), content: 'Saved from the chat session "' + s.title + '".\n\nQ: ' + q + '\n\n' + m.content };
          })
      ];
      const conv = { id: uid(), title: s.title, updatedAt: now(), messages: s.messages.map(({ role, content, engine }) => ({ role, content, engine })) };
      return {
        ...updateSession(w, s.id, { projectId: pid }),
        projects: w.projects.map((p) => (p.id === pid ? { ...p, research: [...research, ...p.research], conversations: [conv, ...p.conversations] } : p))
      };
    });
    setLinking(false);
    nav(`p/${pid}/research`);
  };
  const promote = () => {
    const p = { id: uid(), name: session.title, about: `Started from the chat session "${session.title}".`, createdAt: now(), folders: [], research: [], conversations: [], brds: [], pdns: [], epics: [], stories: [], frs: [], tests: [], releases: [] };
    mutate((w) => ({ ...w, projects: [p, ...w.projects] }));
    linkSession(p.id, p.name);
  };

  const composer = (
    <div className="fs-composer">
      <textarea rows={1} value={input} placeholder={proj ? `Ask about ${proj.name}, the codebase, contracts…` : 'Ask about the connected tenant…'}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
      <button className="fs-send" disabled={busy || !input.trim()} onClick={() => send()} aria-label="Send"><I n="send" s={15} sw={2} /></button>
    </div>
  );

  return (
    <div className={'fs-home' + (railOpen ? '' : ' railclosed')}>
      <div className="fs-chatcol">
        {!session || msgs.length === 0 ? (
          <div className="fs-hero">
            <div className="fs-heromark"><I n="sparkle" s={30} /></div>
            <h1>Good {greet}. What are we building?</h1>
            <p>I'm connected to the Zenith tenant — its code, contracts and every document in this workspace. Chats are saved as sessions; any session can become a project.</p>
            {composer}
            <div className="fs-chips">
              {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}
            </div>
          </div>
        ) : (
          <>
            <div className="fs-sesshead">
              <span className="fs-sesstitle"><I n="message" s={14} /> {session.title}</span>
              {linked
                ? <button className="fs-sesslink on" onClick={() => nav(`p/${linked.id}/research`)}><I n="folder" s={12} /> {linked.name} →</button>
                : (
                  <span className="fs-sessops">
                    <button className="fs-sesslink" onClick={promote}><I n="rocket" s={12} /> Promote to project</button>
                    <button className="fs-sesslink" onClick={() => setLinking(!linking)}><I n="plus" s={12} /> Link existing</button>
                  </span>
                )}
            </div>
            {linking && !linked && (
              <div className="fs-linkmenu">
                {ws.projects.map((p) => <button key={p.id} onClick={() => linkSession(p.id, p.name)}><I n="folder" s={13} /> {p.name}</button>)}
              </div>
            )}
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
              <p className="fs-ground">Grounded on <b>{proj?.name || 'the Zenith tenant'}</b> · {activeModelLabel(ws)}</p>
            </div>
          </>
        )}
      </div>

      {railOpen ? (
        <aside className="fs-docsrail">
          <div className="fs-railhead">
            <h3>Session documents</h3>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <label className="fs-uploadbtn" title={session ? 'Attach to this chat' : 'Start a chat first'}>
                <I n="upload" s={13} /> Upload
                <input type="file" style={{ display: 'none' }} disabled={!session} onChange={(e) => upload(e.target.files)} />
              </label>
              <button className="fs-railtoggle" title="Collapse" onClick={toggleRail}><I n="chevronLeft" s={14} style={{ transform: 'rotate(180deg)' }} /></button>
            </span>
          </div>
          <p className="fs-railhint">
            {linked
              ? <>Attachments also file into <b>{linked.name}</b> as research.</>
              : 'Attachments stay with this chat — promote the session to move them into a project.'}
          </p>
          <div className="fs-doclist">
            {(session?.attachments || []).map((a) => (
              <div key={a.id} className="fs-docrow">
                <I n="file" s={14} style={{ color: 'var(--t)', marginTop: 2 }} />
                <span className="fs-docmain">
                  <span className="fs-doctitle">{a.title}</span>
                  <span className="fs-docmeta">{a.sourceDetail} · {shortDate(a.createdAt)}</span>
                </span>
                <button className="fs-docdel" title="Remove" onClick={() => removeAttachment(a.id)}><I n="x" s={12} /></button>
              </div>
            ))}
            {!(session?.attachments || []).length && <p className="fs-empty" style={{ padding: '6px 0' }}>Nothing attached to this chat yet.</p>}
          </div>
        </aside>
      ) : (
        <button className="fs-railtab" onClick={toggleRail} title="Show session documents">
          <I n="file" s={14} /><span>Documents{session?.attachments?.length ? ` · ${session.attachments.length}` : ''}</span>
        </button>
      )}
    </div>
  );
}
