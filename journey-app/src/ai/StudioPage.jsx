// Feasibility Studio — the PM workflow in one screen:
//   1. Chat your requirements in (each message becomes a requirement).
//   2. One click generates the verdict + User Stories + PDN + Test Cases —
//      inline, no navigation.
//   3. Edit any artifact, save it as a new version, restore old versions,
//      download as markdown.
import React, { useState, useRef, useEffect } from 'react';
import { ai } from '../lib/api';
import { useWorkspace } from './AiPortal';
import { loadWS, saveWS, uid, now, storiesToMd, testsToMd, downloadText } from './workspace';

const SAMPLES = [
  'Offer monthly premium payment (EMI) instead of annual only',
  'Add a ₹2 crore sum insured band',
  'Allow customers to add parents-in-law as covered members',
  'Show PED waiting period per member on the review screen'
];
const DOT = { g: '🟢', a: '🟠', r: '🔴' };
const TABS = ['Verdict', 'User Stories', 'PDN', 'Test Cases'];

const COACH = (n) =>
  n === 0
    ? 'Tell me what you want to build — one requirement per message. When the list looks complete, hit Generate.'
    : `Added as requirement #${n}. Anything else? When you're done, hit ⚡ Generate — stories, PDN and test cases land right here.`;

export default function StudioPage() {
  const { token, analysis, setAnalysis } = useWorkspace();
  const [ws, setWs] = useState(loadWS);
  const [chat, setChat] = useState([{ role: 'assistant', content: COACH(0) }]);
  const [reqs, setReqs] = useState(analysis?.text ? [analysis.text] : []);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('Verdict');
  const [artifactId, setArtifactId] = useState(null);
  const [texts, setTexts] = useState({ stories: '', pdn: '', tests: '' });
  const [saved, setSaved] = useState('');
  const endRef = useRef(null);
  const write = (next) => setWs(saveWS(next));

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat.length]);

  const addReq = (raw) => {
    const q = (raw ?? input).trim();
    if (!q) return;
    const parts = q.split(/\n|;/).map((s) => s.trim()).filter(Boolean);
    const nextReqs = [...reqs, ...parts];
    setReqs(nextReqs);
    setChat((c) => [...c, { role: 'user', content: q }, { role: 'assistant', content: COACH(nextReqs.length) }]);
    setInput('');
  };
  const removeReq = (i) => setReqs(reqs.filter((_, j) => j !== i));

  const artifact = ws.artifacts.find((a) => a.id === artifactId);
  const versions = artifact?.versions || [];

  const generate = async () => {
    if (!reqs.length || busy) return;
    setBusy(true); setErr('');
    try {
      const r = await ai.analyze(token, reqs.join('. '));
      setAnalysis(r);
      if (r.matched) {
        const t = { stories: storiesToMd(r), pdn: r.pdn_markdown || '', tests: testsToMd(r) };
        setTexts(t);
        const art = { id: uid(), title: reqs[0].slice(0, 60), reqs: [...reqs], versions: [{ v: 1, ts: now(), note: 'Generated from requirements', ...t }] };
        write({ ...loadWS(), artifacts: [art, ...loadWS().artifacts] });
        setArtifactId(art.id);
        setTab('Verdict');
        setChat((c) => [...c, { role: 'assistant', content: `Done — verdict is ${r.verdict_label} (${r.effort_points} pts). Stories, PDN and test cases are below: edit, save versions, download.` }]);
      } else {
        setChat((c) => [...c, { role: 'assistant', content: r.note || 'That one needs tech discovery — I could not ground it in the connected code.' }]);
      }
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const saveVersion = () => {
    if (!artifact) return;
    const v = versions.length + 1;
    const nextArt = { ...artifact, versions: [...versions, { v, ts: now(), note: 'Manual edit', ...texts }] };
    write({ ...ws, artifacts: ws.artifacts.map((a) => (a.id === artifact.id ? nextArt : a)) });
    setSaved(`Saved as v${v}`);
    setTimeout(() => setSaved(''), 1800);
  };
  const restore = (v) => {
    const ver = versions.find((x) => x.v === Number(v));
    if (ver) { setTexts({ stories: ver.stories, pdn: ver.pdn, tests: ver.tests }); setSaved(`Restored v${ver.v}`); setTimeout(() => setSaved(''), 1800); }
  };

  const r = analysis;
  const editorFor = { 'User Stories': 'stories', 'PDN': 'pdn', 'Test Cases': 'tests' }[tab];

  return (
    <div>
      <h2>Feasibility Studio</h2>
      <p className="hint">Chat your requirements in → one click generates the verdict, user stories, PDN and test cases — on this screen, editable, versioned, downloadable.</p>

      <div className="studio2col">
        <div className="studiochat">
          <div className="chatlog" style={{ minHeight: 220, maxHeight: 300 }}>
            {chat.map((m, i) => (
              <div key={i} className={'chatmsg ' + m.role}><div className="chatbubble">{m.content}</div></div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="chips">
            {SAMPLES.map((s) => <button key={s} className="chip" onClick={() => addReq(s)}>{s}</button>)}
          </div>
          <div className="chatinput">
            <input value={input} placeholder="Describe a requirement…" onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addReq()} />
            <button className="btn" onClick={() => addReq()}>Add</button>
          </div>
        </div>

        <div className="studioreqs">
          <h3 className="ws-h3" style={{ marginTop: 0 }}>Requirements ({reqs.length})</h3>
          {reqs.map((q, i) => (
            <div key={i} className="reqrow">
              <span>{i + 1}. {q}</span>
              <button onClick={() => removeReq(i)}>✕</button>
            </div>
          ))}
          {!reqs.length && <p className="hint">Nothing yet — add requirements from the chat.</p>}
          <button className="btn gold" style={{ width: '100%' }} disabled={busy || !reqs.length} onClick={generate}>
            {busy ? 'Scanning connected systems…' : '⚡ Generate — Stories · PDN · Tests'}
          </button>
          {err && <p className="error">{err}</p>}
        </div>
      </div>

      {r && r.matched && (
        <div className="studioout">
          <div className="tabsrow">
            {TABS.map((t) => <button key={t} className={'tabbtn ' + (tab === t ? 'on' : '')} onClick={() => setTab(t)}>{t}</button>)}
            <span className="verops">
              {saved && <span className="fieldok" style={{ marginTop: 0 }}>{saved}</span>}
              {versions.length > 0 && (
                <select onChange={(e) => e.target.value && restore(e.target.value)} value="">
                  <option value="">Versions ({versions.length})</option>
                  {versions.slice().reverse().map((v) => <option key={v.v} value={v.v}>v{v.v} — {new Date(v.ts).toLocaleString()} · {v.note}</option>)}
                </select>
              )}
              {editorFor && <button className="btn ghost" style={{ margin: 0, padding: '8px 14px' }} onClick={saveVersion}>Save version</button>}
              {editorFor && <button className="btn ghost" style={{ margin: 0, padding: '8px 14px' }} onClick={() => downloadText(`${editorFor}.md`, texts[editorFor])}>⬇ Download</button>}
              <button className="btn ghost" style={{ margin: 0, padding: '8px 14px' }} onClick={() => downloadText('feasly-artifact.md', `# ${r.text}\n\n## Verdict\n${r.verdict_label} — ${r.effort_points} pts (${r.size})\n\n# User Stories\n\n${texts.stories}\n\n# PDN\n\n${texts.pdn}\n\n# Test Cases\n\n${texts.tests}`)}>⬇ All</button>
            </span>
          </div>

          {tab === 'Verdict' && (
            <>
              <div className={'banner ' + r.overall}>
                <b>{DOT[r.overall]} {r.verdict_label}</b>
                <p className="hint">Effort {r.effort_points} story points ({r.size}) · {r.sprints} · {r.verified}/{r.impacts.length} impacts verified against source code</p>
              </div>
              <table className="dashtable" style={{ marginTop: 14 }}>
                <thead><tr><th></th><th>Component</th><th>System</th><th>Required change</th><th>Code evidence</th></tr></thead>
                <tbody>
                  {r.impacts.map((i, k) => (
                    <tr key={k}>
                      <td>{DOT[i.v]}</td>
                      <td><code>{i.file.split('/').slice(-2).join('/')}</code></td>
                      <td>{r.layers[i.layer].system}</td>
                      <td>{i.change}</td>
                      <td>{i.evidence
                        ? <code className="evidence">L{i.evidence.line}: {i.evidence.snippet}</code>
                        : <span className="tagwarn">not found — verify manually</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {editorFor && (
            <textarea
              className="artifactedit" rows={18}
              value={texts[editorFor]}
              onChange={(e) => setTexts({ ...texts, [editorFor]: e.target.value })}
            />
          )}
        </div>
      )}
    </div>
  );
}
