// Workspace home — deliberately not a dashboard. A greeting, your projects
// as quiet typographic rows, and the documents you touched most recently.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWS, mutate, resetWS, uid, now, TYPES } from './workspace';
import { startCoach } from './DemoCoach';

const ROUTE_OF = { research: 'research', brd: 'brds', pdn: 'pdns', epic: 'epics', story: 'stories', fr: 'frs', test: 'tests' };

export default function HomePage() {
  const nav = useNavigate();
  const ws = useWS();
  const [name, setName] = useState('');
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  const addProject = () => {
    if (!name.trim()) return;
    const p = { id: uid(), name: name.trim(), about: '', createdAt: now(), research: [], conversations: [], brds: [], pdns: [], epics: [], stories: [], frs: [], tests: [], releases: [] };
    mutate((w) => ({ ...w, projects: [p, ...w.projects] }));
    setName('');
    nav(`p/${p.id}/research`);
  };

  // Recent documents across projects, newest first.
  const recent = ws.projects.flatMap((p) =>
    ['research', 'brd', 'pdn', 'epic', 'story', 'fr', 'test'].flatMap((t) =>
      (p[TYPES[t].key] || []).map((d) => ({ project: p, type: t, doc: d }))
    )
  ).sort((a, b) => (b.doc.createdAt || '').localeCompare(a.doc.createdAt || '')).slice(0, 6);

  return (
    <div className="page dark">
      <div className="homewrap">
        <h1 className="homeh1">Good {greet}, PM</h1>
        <p className="homesub">Zenith Health workspace · every document below traces back to the business question that created it.</p>

        <div className="homesect">
          <div className="homesecthead">
            <h2>Projects</h2>
            <span className="homeadd">
              <input value={name} placeholder="New project…" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addProject()} />
              <button onClick={addProject}>Create</button>
            </span>
          </div>
          {ws.projects.map((p) => (
            <button key={p.id} className="homeproj" onClick={() => nav(`p/${p.id}/research`)}>
              <span className="homeprojname">{p.name}</span>
              <span className="homeprojabout">{p.about || '—'}</span>
              <span className="homeprojmeta">
                {p.research.length} research · {p.brds.length} BRDs · {p.stories.length} stories · {p.tests.length} tests
              </span>
            </button>
          ))}
        </div>

        <div className="homesect">
          <h2>Recent documents</h2>
          {recent.map(({ project, type, doc }) => (
            <button key={type + doc.id} className="homedoc" onClick={() => nav(`p/${project.id}/${ROUTE_OF[type]}/${doc.id}`)}>
              <span className="homedocicon">{TYPES[type].icon}</span>
              <span className="homedoctitle">{doc.title}</span>
              <span className="homedocmeta">{TYPES[type].one} · {project.name}</span>
            </button>
          ))}
        </div>

        <p style={{ marginTop: 34, opacity: 0.55, display: 'flex', gap: 18 }}>
          <button className="linkbtn" onClick={startCoach}>🎬 Guided demo</button>
          <button className="linkbtn" onClick={() => { if (window.confirm('Reset the workspace to its seeded demo state? Everything created in this browser is discarded.')) resetWS(); }}>
            ↺ Reset demo data
          </button>
        </p>
      </div>
    </div>
  );
}
