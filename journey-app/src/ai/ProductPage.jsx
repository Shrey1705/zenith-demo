// Product dashboard — the PM's control-center view for one product: every
// project with its computed lifecycle stage, what's gone stale, and what
// ships next. 'all' is the cross-product portfolio (compliance, platform).
import React, { useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { I } from './icons';
import StageStrip from './StageStrip';
import {
  useWS, mutate, uid, now, findProduct, projectsOf, stageInfo, staleCount,
  STAGES, TYPES, shortDate
} from './workspace';

const docCount = (p) => Object.keys(TYPES).reduce((n, t) => n + (p[TYPES[t].key] || []).length, 0);
const nextRelease = (p) => {
  const today = new Date().toISOString().slice(0, 10);
  return (p.releases || []).filter((r) => r.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0] || null;
};

export default function ProductPage() {
  const { prodId } = useParams();
  const nav = useNavigate();
  const ws = useWS();
  const [name, setName] = useState('');
  const product = findProduct(ws, prodId);
  if (!product) return <Navigate to="/ai" replace />;
  const projects = projectsOf(ws, prodId);

  const totals = {
    docs: projects.reduce((n, p) => n + docCount(p), 0),
    stale: projects.reduce((n, p) => n + staleCount(p), 0),
    releases: projects.flatMap((p) => p.releases || []).length,
    shipped: projects.filter((p) => stageInfo(p).done.launch).length
  };

  const addProject = () => {
    if (!name.trim()) return;
    const p = { id: uid(), name: name.trim(), about: '', productId: prodId, createdAt: now(), folders: [], research: [], conversations: [], brds: [], pdns: [], epics: [], stories: [], frs: [], tests: [], releases: [] };
    mutate((w) => ({ ...w, projects: [p, ...w.projects] }));
    setName('');
    nav(`/ai/p/${p.id}/research`);
  };

  return (
    <div className="docwrap">
      <p className="doctype"><I n={prodId === 'all' ? 'layers' : 'target'} s={13} style={{ color: 'var(--p)' }} /> {prodId === 'all' ? 'Shared portfolio' : 'Product'}</p>
      <h1 className="doch1">{product.name}</h1>
      <p className="docsub">{product.about}</p>

      <div className="prodkpis">
        <div className="prodkpi"><b>{projects.length}</b><span>Project{projects.length === 1 ? '' : 's'}</span></div>
        <div className="prodkpi"><b>{totals.docs}</b><span>Documents in chains</span></div>
        <div className={'prodkpi' + (totals.stale ? ' warn' : '')}><b>{totals.stale}</b><span>Flagged stale</span></div>
        <div className="prodkpi"><b>{totals.shipped}/{projects.length || 0}</b><span>Reached launch</span></div>
      </div>

      <div className="prodhead">
        <h3 className="ws-h3" style={{ margin: 0 }}>Projects</h3>
        <span className="homeadd">
          <input value={name} placeholder="New project…" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addProject()} />
          <button onClick={addProject}>Create</button>
        </span>
      </div>

      <div className="prodgrid">
        {projects.map((p) => {
          const st = stageInfo(p);
          const stale = staleCount(p);
          const rel = nextRelease(p);
          return (
            <button key={p.id} className="prodcard" onClick={() => nav(`/ai/p/${p.id}/research`)}>
              <span className="prodcardtop">
                <b>{p.name}</b>
                <StageStrip project={p} compact />
              </span>
              {p.about && <span className="prodcardabout">{p.about}</span>}
              <span className="prodcardmeta">
                <span><I n="book" s={12} /> {p.research.length} research</span>
                <span><I n="clipboard" s={12} /> {p.brds.length} BRD{p.brds.length === 1 ? '' : 's'}</span>
                <span><I n="flask" s={12} /> {p.tests.length} tests</span>
                {stale > 0 && <span className="prodstale"><I n="refresh" s={12} /> {stale} stale</span>}
                {rel && <span className="prodrel"><I n="rocket" s={12} /> {rel.name.split('—')[0].trim()} · {shortDate(rel.date)}</span>}
              </span>
              <span className="prodcardstage">
                {STAGES.find((s) => s.id === st.current)?.label} · {st.currentIdx + 1}/5
              </span>
            </button>
          );
        })}
        {!projects.length && (
          <p className="fs-empty" style={{ padding: '18px 4px' }}>
            No projects here yet — create one above, or promote a chat session into this product.
          </p>
        )}
      </div>
    </div>
  );
}
