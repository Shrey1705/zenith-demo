// Research workspace — first-class knowledge, not chat scrollback. Ask the
// AI and save answers as documents; upload files; import Confluence pages or
// API docs; write manual notes. Everything here can ride into a BRD.
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkspace } from './AiPortal';
import { askFeasly } from './brain';
import { I, TypeIcon } from './icons';
import { useWS, mutate, uid, now, titleFrom, findProject, findDoc, addDoc, updateDoc, removeDoc, shortDate, usingLocal, activeModelLabel } from './workspace';
import TraceRail from './TraceRail';

const SOURCE_LABEL = { note: 'Manual note', ai: 'Saved AI answer', upload: 'Uploaded file', confluence: 'Confluence import', api: 'API docs import', playbook: 'Playbook output' };

export default function ResearchPage() {
  const { pid, docId } = useParams();
  const nav = useNavigate();
  const ws = useWS();
  const { token } = useWorkspace();
  const project = findProject(ws, pid);
  const doc = docId ? findDoc(project, 'research', docId) : null;
  const [ask, setAsk] = useState('');
  const [askBusy, setAskBusy] = useState(false);
  const [answer, setAnswer] = useState(null);

  if (doc) return <ResearchDoc project={project} doc={doc} pid={pid} />;

  const add = (r) => { mutate((w) => addDoc(w, pid, 'research', r)); nav(r.id); };

  const askAi = async () => {
    const q = ask.trim();
    if (!q || askBusy) return;
    setAskBusy(true);
    try {
      const r = await askFeasly({ token, ws, project, messages: [{ role: 'user', content: q }] });
      setAnswer({ q, a: r.reply, sources: r.sources, engine: r.engine });
    } catch (e) { setAnswer({ q, a: `Something went wrong: ${e.message}` }); }
    setAskBusy(false);
  };
  const saveAnswer = () => {
    add({ id: uid(), title: titleFrom(answer.q), source: 'ai', createdAt: now(), content: 'Saved from an Ask-AI session.\n\nQ: ' + answer.q + '\n\n' + answer.a });
    setAnswer(null); setAsk('');
  };

  const newNote = () => add({ id: uid(), title: 'Untitled note', source: 'note', createdAt: now(), content: '' });
  const importConfluence = () => add({
    id: uid(), title: 'Payments runbook (Confluence)', source: 'confluence', sourceDetail: 'space PAY · page 4211', createdAt: now(),
    content: 'Imported from Confluence.\n\nOperational runbook for the payments integration: settlement windows are T+1, reconciliation jobs run at 02:00 IST, and any schedule-based product must define behaviour for a failed reconciliation before launch.'
  });
  const importApi = () => add({
    id: uid(), title: 'Payment gateway capabilities — recurring mandates', source: 'api', sourceDetail: 'Imported from gateway API docs', createdAt: now(),
    content: 'Imported from API documentation.\n\nThe gateway supports tokenised recurring mandates (UPI Autopay + card standing instructions) with a webhook per instalment.\n\nRelevant limits: mandate ceiling ₹15,000/instalment without re-auth; webhook retries for 72 hours, then gives up; refunds must reference the original instalment id.\n\nNo built-in default handling — if an instalment fails, the product decides what happens next.'
  });
  const uploadFile = (files) => {
    const f = files[0];
    if (!f) return;
    add({ id: uid(), title: f.name.replace(/\.[a-z0-9]+$/i, ''), source: 'upload', sourceDetail: f.name, createdAt: now(), content: `Uploaded file: ${f.name} (${Math.max(1, Math.round(f.size / 1024))} KB).\n\nAdd your read-out here — key quotes, numbers and decisions worth carrying into a BRD.` });
  };

  return (
    <div className="docwrap">
      <h1 className="doch1">Research</h1>
      <p className="docsub">Understand before you specify. Answers saved here become searchable knowledge a BRD can cite.</p>

      <div className="askbar">
        <input value={ask} placeholder="Ask about the codebase, contracts or docs… e.g. can we support EMI payments?"
          onChange={(e) => setAsk(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && askAi()} />
        <button disabled={askBusy} onClick={askAi}>{askBusy ? (usingLocal(ws) ? 'Asking local model…' : 'Thinking…') : '✦ Ask'}</button>
      </div>
      {answer && (
        <div className="askanswer">
          <pre className="prose">{answer.a}</pre>
          {answer.sources?.length > 0 && (
            <div className="srcchips">
              <span className="srclbl">Grounded on</span>
              {answer.sources.map((s, j) => <span key={j} className="srcchip"><TypeIcon type={s.type} s={11} /> {s.title}</span>)}
            </div>
          )}
          {answer.engine === 'local' && <p className="chatengine"><I n="cpu" s={11} /> {activeModelLabel(ws)}</p>}
          <span>
            <button className="linkbtn gold" onClick={saveAnswer}>Save as research document</button>
            <button className="linkbtn" onClick={() => setAnswer(null)}>Discard</button>
          </span>
        </div>
      )}

      <div className="resadders">
        <button onClick={newNote}><I n="pen" s={13} /> New note</button>
        <label className="resupload"><I n="upload" s={13} /> Upload file<input type="file" style={{ display: 'none' }} onChange={(e) => uploadFile(e.target.files)} /></label>
        <button onClick={importConfluence}><I n="globe" s={13} /> Import from Confluence</button>
        <button onClick={importApi}><I n="plug" s={13} /> Import API docs</button>
      </div>

      <div className="klist">
        {project.research.map((r) => (
          <button key={r.id} className="krow" onClick={() => nav(r.id)}>
            <span className="krowmain">
              <span className="krowtitle">{r.title}</span>
              <span className="krowmeta">{SOURCE_LABEL[r.source]}{r.sourceDetail ? ` · ${r.sourceDetail}` : ''} · {shortDate(r.createdAt)}</span>
            </span>
            <span className="krowside">{project.brds.filter((b) => b.researchIds.includes(r.id)).length > 0 ? 'cited' : ''}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ResearchDoc({ project, doc, pid }) {
  const nav = useNavigate();
  const patch = (p) => mutate((w) => updateDoc(w, pid, 'research', doc.id, p));

  const actions = [
    {
      label: 'Summarize', done: doc.content.startsWith('TL;DR'),
      disabled: doc.content.startsWith('TL;DR'),
      run: () => {
        const firstLines = doc.content.split(/\n+/).filter((l) => l.trim().length > 30).slice(0, 2).join(' ');
        patch({ content: `TL;DR — ${firstLines.slice(0, 220)}\n\n${doc.content}` });
      }
    },
    { label: 'Delete note', run: () => { mutate((w) => removeDoc(w, pid, 'research', doc.id)); nav(`/ai/p/${pid}/research`); } }
  ];

  return (
    <div className="docwrap">
      <button className="linkbtn" onClick={() => nav(`/ai/p/${pid}/research`)}>← Research</button>
      <div className="docpane">
        <article className="docbody">
          <p className="doctype">{SOURCE_LABEL[doc.source]}{doc.sourceDetail ? ` · ${doc.sourceDetail}` : ''} · {shortDate(doc.createdAt)}</p>
          <input className="doctitleedit" value={doc.title} onChange={(e) => patch({ title: e.target.value })} />
          <textarea className="prosedit" rows={16} value={doc.content} placeholder="Write the note…" onChange={(e) => patch({ content: e.target.value })} />
        </article>
        <TraceRail project={project} type="research" doc={doc} actions={actions} />
      </div>
    </div>
  );
}
