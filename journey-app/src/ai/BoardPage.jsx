// Sprint board — the agile slice of the workspace. Stories from the chain
// move To do → In progress → In review → Done; every card keeps its full
// trace back to the BRD, and Done feeds the release pipeline on Releases.
// Status lives on the story document itself (default: todo).
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { I } from './icons';
import { useWS, mutate, findProject, updateDoc, staleInfo, can } from './workspace';

const COLS = [
  { id: 'todo', label: 'To do' },
  { id: 'inprogress', label: 'In progress' },
  { id: 'review', label: 'In review' },
  { id: 'done', label: 'Done' }
];
export const storyStatus = (s) => s.status || 'todo';

export default function BoardPage() {
  const { pid } = useParams();
  const nav = useNavigate();
  const ws = useWS();
  const project = findProject(ws, pid);
  const editable = can(ws, 'edit');

  const move = (story, dir) => {
    const idx = COLS.findIndex((c) => c.id === storyStatus(story));
    const next = COLS[idx + dir];
    if (next) mutate((w) => updateDoc(w, pid, 'story', story.id, { status: next.id }));
  };

  const releaseOf = (sid) => project.releases.find((r) => (r.storyIds || []).includes(sid));

  return (
    <div className="docwrap">
      <h1 className="doch1">Sprint Board</h1>
      <p className="docsub">
        Every card traces back to a requirement — click through to see why it exists.
        {!editable && ' Read-only role: statuses can be viewed, not moved.'}
      </p>
      {!project.stories.length ? (
        <p className="railempty">No user stories yet — generate the delivery chain from a BRD, and they land here ready to plan.</p>
      ) : (
        <div className="kb">
          {COLS.map((col, ci) => {
            const cards = project.stories.filter((s) => storyStatus(s) === col.id);
            const pts = cards.reduce((a, s) => a + (s.points || 0), 0);
            return (
              <div key={col.id} className="kbcol">
                <div className="kbhead">{col.label} <span className="fs-count">{cards.length}{pts ? ` · ${pts} pts` : ''}</span></div>
                {cards.map((s) => {
                  const stale = staleInfo(project, 'story', s);
                  const rel = releaseOf(s.id);
                  return (
                    <div key={s.id} className={'kbcard' + (stale ? ' stale' : '')}>
                      <button className="kbtitle" onClick={() => nav(`/ai/p/${pid}/stories/${s.id}`)}>{s.title}</button>
                      <div className="kbmeta">
                        {s.points ? <span>{s.points} pts</span> : null}
                        {s.component && <span>{s.component}</span>}
                        {rel && <span className="kbrel"><I n="rocket" s={10} /> {rel.name}</span>}
                        {stale && <span className="kbstale" title={`BRD moved to v${stale.current}; this story was generated from v${stale.from}`}>upstream changed</span>}
                      </div>
                      {editable && (
                        <div className="kbmove">
                          <button disabled={ci === 0} onClick={() => move(s, -1)} aria-label="Move left">‹</button>
                          <button disabled={ci === COLS.length - 1} onClick={() => move(s, 1)} aria-label="Move right">›</button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {!cards.length && <p className="kbempty">—</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
