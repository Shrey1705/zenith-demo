// BRD Workspace — the core of the redesign. Every change request lives as a
// BRD moving through three states: Draft -> Locked -> Generated.
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ai } from '../lib/api';
import { useWorkspace } from './AiPortal';
import {
  loadWS, saveWS, findProject, findBrd, updateBrd, updateBrdSections,
  brdStatusMeta, DOT, BRD_SAMPLES, storiesToMd, testsToMd, pdnFallbackMd, downloadText
} from './workspace';

const COACH_INTRO = "Tell me about this change — background, who's affected, what success looks like. Each message you send gets added as a requirement.";
const TABS = ['Verdict', 'PDN', 'User Stories', 'Test Cases'];

export default function BrdPage() {
  const { token } = useWorkspace();
  const nav = useNavigate();
  const { projectId, brdId } = useParams();
  const [ws, setWs] = useState(loadWS);
  const [reqInput, setReqInput] = useState('');
  const [chat, setChat] = useState([{ role: 'assistant', content: COACH_INTRO }]);
  const [chatInput, setChatInput] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState('Verdict');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const project = findProject(ws, projectId);
  const brd = findBrd(ws, projectId, brdId);
  const write = (next) => setWs(saveWS(next));

  if (!project || !brd) return <p className="hint">BRD not found. <button className="linkbtn" onClick={() => nav(`/ai/projects/${projectId || ''}`)}>← Back</button></p>;

  const meta = brdStatusMeta(brd);
  const patchSections = (patch) => write(updateBrdSections(ws, projectId, brdId, patch));
  const patch = (p) => write(updateBrd(ws, projectId, brdId, p));

  // ---- Draft mode ----
  const addRequirement = (text) => {
    const q = text.trim();
    if (!q) return;
    patchSections({ requirements: [...brd.sections.requirements, q] });
  };
  const removeRequirement = (i) => patchSections({ requirements: brd.sections.requirements.filter((_, j) => j !== i) });
  const useSample = (i) => {
    const sample = BRD_SAMPLES[i];
    const sectionPatch = { requirements: [...brd.sections.requirements, sample.req] };
    if (!brd.sections.background.trim()) sectionPatch.background = sample.bg;
    patchSections(sectionPatch);
    setChat((c) => [...c, { role: 'user', content: sample.req },
      { role: 'assistant', content: 'Added as requirement, and filled in Background from context. Add more requirements, or lock the BRD now to generate the PDN, User Stories and Test Cases →' }]);
  };
  const sendChat = () => {
    const q = chatInput.trim();
    if (!q) return;
    addRequirement(q);
    setChat((c) => [...c, { role: 'user', content: q },
      { role: 'assistant', content: `Added as requirement #${brd.sections.requirements.length + 1}. Anything else? When the BRD looks complete, lock it.` }]);
    setChatInput('');
  };

  const lockDisabled = !(brd.sections.background.trim() && brd.sections.requirements.length);
  const lockBrd = () => { if (!lockDisabled) patch({ status: 'locked', lockedAt: 'locked just now' }); };
  const unlockBrd = () => patch({ status: 'draft' });

  const generate = async () => {
    setBusy(true); setErr('');
    try {
      const r = await ai.analyze(token, brd.sections.requirements.join('. ') || brd.sections.background);
      if (!r.matched) {
        setErr(r.note || 'Needs tech discovery — could not ground this in the connected code.');
        setBusy(false);
        return;
      }
      const analysis = {
        overall: r.overall, verdictLabel: r.verdict_label, points: r.effort_points, sprints: r.sprints,
        verified: `${r.verified}/${r.impacts.length}`,
        impacts: r.impacts.map((i) => ({ dot: DOT[i.v] || '⚪', system: r.layers[i.layer]?.system || i.layer, change: i.change, evidenceText: i.evidence ? `L${i.evidence.line}: ${i.evidence.snippet}` : 'not found — verify manually' }))
      };
      const artifacts = { pdn: pdnFallbackMd(r), stories: storiesToMd(r), tests: testsToMd(r) };
      // Keep the "grounded in code" moment feeling substantive even though the real call is fast.
      setTimeout(() => { patch({ status: 'generated', analysis, artifacts }); setTab('Verdict'); setBusy(false); }, 700);
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  return (
    <div>
      <button className="linkbtn" onClick={() => nav(`/ai/projects/${projectId}`)}>← {project.name}</button>
      <div className="brdhead">
        <h1 className="brdh1">{brd.title}</h1>
        <span className="statuspill">{meta.emoji} {meta.label}</span>
      </div>

      {brd.status === 'draft' && (
        <div className="brdgrid">
          <div className="brdpanel">
            <label>Background &amp; context</label>
            <textarea rows={3} value={brd.sections.background} placeholder="What's the business problem? Why now?" onChange={(e) => patchSections({ background: e.target.value })} />

            <label style={{ marginTop: 20 }}>Business requirements ({brd.sections.requirements.length})</label>
            <div>
              {brd.sections.requirements.map((r, i) => (
                <div className="reqrow" key={i}>
                  <span>{i + 1}. {r}</span>
                  <button onClick={() => removeRequirement(i)}>✕</button>
                </div>
              ))}
              {!brd.sections.requirements.length && <p className="hint" style={{ color: '#5b7291' }}>None yet — add requirements via chat, or type below.</p>}
            </div>
            <div className="reqaddrow">
              <input value={reqInput} placeholder="Add a requirement…" onChange={(e) => setReqInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { addRequirement(reqInput); setReqInput(''); } }} />
              <button className="ghostaddbtn" onClick={() => { addRequirement(reqInput); setReqInput(''); }}>Add</button>
            </div>

            <label style={{ marginTop: 20 }}>Stakeholders</label>
            <input value={brd.sections.stakeholders} placeholder="Who signs off on this?" onChange={(e) => patchSections({ stakeholders: e.target.value })} />

            <label style={{ marginTop: 20 }}>Success criteria</label>
            <textarea rows={2} value={brd.sections.success} placeholder="How will we know this worked?" onChange={(e) => patchSections({ success: e.target.value })} />

            <div className="brdlockrow">
              <button className="btn gold" disabled={lockDisabled} onClick={lockBrd}>🔒 Lock BRD →</button>
            </div>
          </div>

          <div className="brdassist">
            <h3>BRD Assistant</h3>
            <p className="hint" style={{ marginTop: 0 }}>Describe the change — each message becomes a candidate requirement.</p>
            {brd.sections.requirements.length === 0 && (
              <>
                <p className="samplelbl">Try a sample — full demo walkthrough</p>
                <div className="samplechips">
                  {BRD_SAMPLES.map((s, i) => <button key={i} onClick={() => useSample(i)}>{s.req}</button>)}
                </div>
              </>
            )}
            <div className="brdchatlog">
              {chat.map((m, i) => <div className="brdchatmsg" key={i}>{m.content}</div>)}
            </div>
            <div className="reqaddrow" style={{ marginTop: 10 }}>
              <input value={chatInput} placeholder="Type a requirement…" onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChat()} />
              <button className="btn" style={{ marginTop: 0 }} onClick={sendChat}>Add</button>
            </div>
          </div>
        </div>
      )}

      {brd.status !== 'draft' && (
        <>
          <div className="brdlockedbar">
            <div className="brdlockedtop">
              <span className="brdlockedlbl">🔒 Locked · edited by PM · {brd.lockedAt}</span>
              <span className="brdlockedops">
                <button className="linkbtn gold" onClick={() => setExpanded((v) => !v)}>{expanded ? 'Hide BRD' : 'View BRD'}</button>
                <button className="linkbtn" onClick={unlockBrd}>Unlock to edit</button>
              </span>
            </div>
            {expanded && (
              <div className="brdexpand">
                <div><span className="brdexpandlbl">Background</span><span className="brdexpandval">{brd.sections.background}</span></div>
                <div>
                  <span className="brdexpandlbl">Requirements</span>
                  {brd.sections.requirements.map((r, i) => <span className="brdexpandval" key={i} style={{ display: 'block' }}>{i + 1}. {r}</span>)}
                </div>
                <div><span className="brdexpandlbl">Stakeholders</span><span className="brdexpandval">{brd.sections.stakeholders}</span></div>
                <div><span className="brdexpandlbl">Success criteria</span><span className="brdexpandval">{brd.sections.success}</span></div>
              </div>
            )}
          </div>

          {brd.status === 'locked' && (
            <div className="gencta">
              <div className="genicon">⚡</div>
              <h3>Generate PDN, User Stories &amp; Test Cases</h3>
              <p>Grounded in the connected Zenith codebase — every impact verified against actual source, with file-and-line evidence.</p>
              <button className="btn gold" disabled={busy} onClick={generate}>{busy ? 'Scanning connected systems…' : '⚡ Generate from locked BRD'}</button>
              {err && <p className="error">{err}</p>}
            </div>
          )}

          {brd.status === 'generated' && brd.analysis && (
            <>
              <div className="tabsrow">
                {TABS.map((t) => <button key={t} className={'tabbtn ' + (tab === t ? 'on' : '')} onClick={() => setTab(t)}>{t}</button>)}
                <span className="verops">
                  <button className="btn ghost" style={{ margin: 0, padding: '8px 14px' }} onClick={() => {
                    const map = { PDN: ['pdn', 'pdn.md'], 'User Stories': ['stories', 'stories.md'], 'Test Cases': ['tests', 'tests.md'] };
                    const m = map[tab];
                    downloadText(m ? m[1] : 'verdict.md', m ? brd.artifacts[m[0]] : `# ${brd.title}\n\nVerdict: ${brd.analysis.verdictLabel} — ${brd.analysis.points} pts`);
                  }}>⬇ Download</button>
                </span>
              </div>

              {tab === 'Verdict' && (
                <>
                  <div className={'banner ' + brd.analysis.overall}>
                    <b>{DOT[brd.analysis.overall]} {brd.analysis.verdictLabel}</b>
                    <p className="hint">Effort {brd.analysis.points} story points · {brd.analysis.sprints} · {brd.analysis.verified} impacts verified against source code</p>
                  </div>
                  <table className="dashtable" style={{ marginTop: 14 }}>
                    <thead><tr><th></th><th>System</th><th>Required change</th><th>Code evidence</th></tr></thead>
                    <tbody>
                      {brd.analysis.impacts.map((im, i) => (
                        <tr key={i}>
                          <td>{im.dot}</td>
                          <td>{im.system}</td>
                          <td>{im.change}</td>
                          <td>{im.evidenceText.startsWith('not found') ? <span className="tagwarn">{im.evidenceText}</span> : <code className="evidence">{im.evidenceText}</code>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              {tab === 'PDN' && <textarea className="artifactedit" rows={18} value={brd.artifacts.pdn} onChange={(e) => patch({ artifacts: { ...brd.artifacts, pdn: e.target.value } })} />}
              {tab === 'User Stories' && <textarea className="artifactedit" rows={18} value={brd.artifacts.stories} onChange={(e) => patch({ artifacts: { ...brd.artifacts, stories: e.target.value } })} />}
              {tab === 'Test Cases' && <textarea className="artifactedit" rows={18} value={brd.artifacts.tests} onChange={(e) => patch({ artifacts: { ...brd.artifacts, tests: e.target.value } })} />}
            </>
          )}
        </>
      )}
    </div>
  );
}
