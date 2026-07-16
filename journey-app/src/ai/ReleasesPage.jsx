// Releases — the CI/CD slice. A release bundles stories, then promotes
// through environments (Build → Test → Staging → Production) like a real
// deployment pipeline. A computed Definition-of-Done gate — every story Done
// on the board, test cases present, no upstream drift — must pass before a
// release reaches Production, so the pipeline can't ship an unfinished slice.
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { I } from './icons';
import { useWS, mutate, uid, now, findProject, staleInfo, can } from './workspace';
import { storyStatus } from './BoardPage';

const ENVS = [
  { id: 'build', label: 'Build' },
  { id: 'test', label: 'Test' },
  { id: 'staging', label: 'Staging' },
  { id: 'production', label: 'Production' }
];
const envIdx = (r) => Math.max(0, ENVS.findIndex((e) => e.id === (r.env || 'build')));

// Definition of Done — computed from the chain, never hand-checked.
function dod(project, release) {
  const stories = release.storyIds.map((sid) => project.stories.find((s) => s.id === sid)).filter(Boolean);
  const allDone = stories.length > 0 && stories.every((s) => storyStatus(s) === 'done');
  const anyStale = stories.some((s) => staleInfo(project, 'story', s));
  const storyIds = new Set(stories.map((s) => s.id));
  const frIds = new Set(project.frs.filter((f) => storyIds.has(f.storyId)).map((f) => f.id));
  const hasTests = project.tests.some((t) => frIds.has(t.frId));
  return [
    { ok: allDone, label: 'All stories moved to Done on the board' },
    { ok: hasTests, label: 'Test cases exist for the shipped requirements' },
    { ok: !anyStale, label: 'No upstream drift — chain matches the current BRD' },
    { ok: !!release.date && release.date !== '—', label: 'Release date set' }
  ];
}

export default function ReleasesPage() {
  const { pid } = useParams();
  const nav = useNavigate();
  const ws = useWS();
  const project = findProject(ws, pid);
  const editable = can(ws, 'edit');
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [picked, setPicked] = useState([]);

  const create = () => {
    if (!name.trim()) return;
    mutate((w) => ({
      ...w,
      projects: w.projects.map((p) => p.id !== pid ? p : {
        ...p, releases: [{ id: uid(), name: name.trim(), date: date || '—', env: 'build', storyIds: picked, createdAt: now() }, ...p.releases]
      })
    }));
    setName(''); setDate(''); setPicked([]);
  };
  const setEnv = (rid, env) => mutate((w) => ({
    ...w,
    projects: w.projects.map((p) => p.id !== pid ? p : { ...p, releases: p.releases.map((r) => (r.id === rid ? { ...r, env } : r)) })
  }));

  return (
    <div className="docwrap">
      <h1 className="doch1">Releases &amp; Delivery</h1>
      <p className="docsub">Bundle stories, then promote the release through your environments. Production is gated by a Definition of Done computed from the chain.{!editable && ' Read-only role: pipeline is view-only.'}</p>

      <div className="klist">
        {project.releases.map((r) => {
          const stories = r.storyIds.map((sid) => project.stories.find((s) => s.id === sid)).filter(Boolean);
          const pts = stories.reduce((a, s) => a + (s.points || 0), 0);
          const checks = dod(project, r);
          const dodPass = checks.every((c) => c.ok);
          const cur = envIdx(r);
          const atProd = ENVS[cur].id === 'production';
          return (
            <div key={r.id} className="relcard">
              <div className="relcardhead">
                <span className="krowtitle"><I n="rocket" s={14} style={{ color: 'var(--p)' }} /> {r.name}</span>
                <span className="krowmeta">{r.date} · {stories.length} stories · {pts} points</span>
              </div>

              <div className="pipeline">
                {ENVS.map((e, i) => (
                  <React.Fragment key={e.id}>
                    <span className={'pipestage' + (i < cur ? ' past' : '') + (i === cur ? ' cur' : '')}>
                      {i < cur ? <I n="check" s={11} sw={2.4} /> : null}{e.label}
                    </span>
                    {i < ENVS.length - 1 && <span className={'pipearrow' + (i < cur ? ' past' : '')} />}
                  </React.Fragment>
                ))}
              </div>

              <div className="dod">
                {checks.map((c, i) => (
                  <span key={i} className={'dodrow' + (c.ok ? ' ok' : '')}>
                    <I n={c.ok ? 'check' : 'dot'} s={12} sw={2.4} /> {c.label}
                  </span>
                ))}
              </div>

              <div className="relstories">
                {stories.map((s) => (
                  <button key={s.id} className={'convchip ghost' + (storyStatus(s) === 'done' ? ' done' : '')} onClick={() => nav(`/ai/p/${pid}/stories/${s.id}`)}>
                    {storyStatus(s) === 'done' ? '✓ ' : ''}{s.title.slice(0, 40)}
                  </button>
                ))}
              </div>

              {editable && (
                <div className="relactions">
                  {cur > 0 && <button className="relbtn ghost" onClick={() => setEnv(r.id, ENVS[cur - 1].id)}>‹ Roll back</button>}
                  {!atProd && (
                    <button className="relbtn" disabled={ENVS[cur + 1].id === 'production' && !dodPass}
                      title={ENVS[cur + 1].id === 'production' && !dodPass ? 'Definition of Done not met — resolve the unchecked items first' : ''}
                      onClick={() => setEnv(r.id, ENVS[cur + 1].id)}>
                      Promote to {ENVS[cur + 1].label} ›
                    </button>
                  )}
                  {atProd && <span className="relshipped"><I n="check" s={12} sw={2.4} /> Live in production</span>}
                </div>
              )}
            </div>
          );
        })}
        {!project.releases.length && <p className="railempty">No releases yet.</p>}
      </div>

      {editable && (
        <>
          <h3 className="docsecth" style={{ marginTop: 30 }}>Plan a release</h3>
          <div className="homeadd">
            <input value={name} placeholder="Release name — e.g. R-2026.09" onChange={(e) => setName(e.target.value)} />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ maxWidth: 160 }} />
            <button onClick={create}>Create</button>
          </div>
          <div style={{ marginTop: 10 }}>
            {project.stories.map((st) => (
              <label className="reslink" key={st.id}>
                <input type="checkbox" checked={picked.includes(st.id)}
                  onChange={(e) => setPicked(e.target.checked ? [...picked, st.id] : picked.filter((x) => x !== st.id))} />
                <span>{st.title} {st.points ? `· ${st.points} pts` : ''} {storyStatus(st) === 'done' ? '· ✓ done' : ''}</span>
              </label>
            ))}
            {!project.stories.length && <p className="railempty">No stories to bundle yet — generate a delivery chain first.</p>}
          </div>
        </>
      )}
    </div>
  );
}
