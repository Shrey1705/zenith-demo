// Releases — light bundling of user stories into a dated release. Kept
// deliberately thin: the traceability lives on the artifacts themselves.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { I } from './icons';
import { useWS, mutate, uid, now, findProject, shortDate } from './workspace';

export default function ReleasesPage() {
  const { pid } = useParams();
  const nav = useNavigate();
  const ws = useWS();
  const project = findProject(ws, pid);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [picked, setPicked] = useState([]);

  const create = () => {
    if (!name.trim()) return;
    mutate((w) => ({
      ...w,
      projects: w.projects.map((p) => p.id !== pid ? p : {
        ...p, releases: [{ id: uid(), name: name.trim(), date: date || '—', storyIds: picked, createdAt: now() }, ...p.releases]
      })
    }));
    setName(''); setDate(''); setPicked([]);
  };

  return (
    <div className="docwrap">
      <h1 className="doch1">Releases</h1>
      <p className="docsub">Bundle stories into a dated cut. Each story keeps its full chain back to the BRD.</p>

      <div className="klist">
        {project.releases.map((r) => {
          const stories = r.storyIds.map((sid) => project.stories.find((s) => s.id === sid)).filter(Boolean);
          const pts = stories.reduce((a, s) => a + (s.points || 0), 0);
          return (
            <div key={r.id} className="krow static">
              <span className="krowmain">
                <span className="krowtitle"><I n="rocket" s={14} style={{ color: 'var(--p)' }} /> {r.name}</span>
                <span className="krowmeta">{r.date} · {stories.length} stories · {pts} points</span>
                <span className="relstories">
                  {stories.map((s) => (
                    <button key={s.id} className="convchip ghost" onClick={() => nav(`/ai/p/${pid}/stories/${s.id}`)}>{s.title.slice(0, 44)}</button>
                  ))}
                </span>
              </span>
            </div>
          );
        })}
        {!project.releases.length && <p className="railempty">No releases yet.</p>}
      </div>

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
            <span>{st.title} {st.points ? `· ${st.points} pts` : ''}</span>
          </label>
        ))}
        {!project.stories.length && <p className="railempty">No stories to bundle yet — generate a delivery chain first.</p>}
      </div>
    </div>
  );
}
