// Playbooks — run a curated PM workflow against everything the project
// already knows. Cards are stage-aware: the ones matching the project's
// computed lifecycle stage surface first with a "recommended" badge, so the
// page always suggests the right next move.
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { I } from './icons';
import { useWS, mutate, findProject, stageInfo, STAGES, usingLocal, activeModelLabel, can } from './workspace';
import { PLAYBOOKS, runPlaybook, landOutput } from './playbooks';

export default function PlaybooksPage() {
  const { pid } = useParams();
  const nav = useNavigate();
  const ws = useWS();
  const project = findProject(ws, pid);
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState('');
  const { current } = stageInfo(project);

  // Recommended playbooks (current stage) lead; the rest keep their order.
  const ordered = [...PLAYBOOKS].sort((a, b) => (b.stage === current) - (a.stage === current));

  const run = async (pb) => {
    setBusy(pb.id); setErr('');
    try {
      const result = await runPlaybook({ playbook: pb, project, ws });
      mutate((w) => landOutput(w, pid, pb, result));
      nav(`/ai/p/${pid}/${result._route}`);
    } catch {
      setErr('The playbook could not run — try again.');
    } finally { setBusy(null); }
  };

  return (
    <div className="docwrap">
      <h1 className="doch1">Playbooks</h1>
      <p className="docsub">
        Curated PM workflows that turn this project's knowledge into finished documents.
        Engine: <b>{activeModelLabel(ws)}</b>{!usingLocal(ws) && <> — connect a local model in Settings for richer prose; the structure is identical either way.</>}
      </p>
      {err && <p className="error">{err}</p>}

      <div className="pbgrid">
        {ordered.map((pb) => {
          const blocked = pb.ready(project);
          const rec = pb.stage === current;
          return (
            <div key={pb.id} className={'pbcard' + (rec ? ' rec' : '')}>
              <div className="pbcardtop">
                <span className="pbicon"><I n={pb.icon} s={16} /></span>
                <b>{pb.label}</b>
                {rec && <span className="pbbadge">Recommended now</span>}
              </div>
              <p className="pbdesc">{pb.desc}</p>
              <div className="pbfoot">
                <span className="pbmeta">
                  <I n="dot" s={8} /> {STAGES.find((s) => s.id === pb.stage).label} · outputs {pb.out}
                </span>
                {!can(ws, 'run')
                  ? <span className="pbblocked">Read-only role — playbooks need editor access</span>
                  : blocked
                    ? <span className="pbblocked" title={blocked}>{blocked}</span>
                    : <button className="pbrun" disabled={!!busy} onClick={() => run(pb)}>
                        {busy === pb.id ? 'Running…' : <><I n="play" s={11} /> Run</>}
                      </button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
