// Knowledge Graph — the project's artifacts as connected knowledge, not
// folders. Seven typed columns, edges for created-from/references, click a
// node to light up its full upstream and downstream chain.
import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWS, findProject, TYPES, CHAIN, ROUTE_OF, upstreamOf, downstreamOf, staleInfo } from './workspace';

const COL_W = 188, NODE_W = 160, NODE_H = 42, ROW_H = 60, PAD = 28;

export default function GraphPage() {
  const { pid } = useParams();
  const nav = useNavigate();
  const ws = useWS();
  const project = findProject(ws, pid);
  const [sel, setSel] = useState(null);

  const { nodes, edges, height } = useMemo(() => buildGraph(project), [project]);

  // Connected set for the selected node: itself + full upstream + downstream.
  const connected = useMemo(() => {
    if (!sel) return null;
    const node = nodes.find((n) => n.key === sel);
    if (!node) return null;
    const set = new Set([sel]);
    upstreamOf(project, node.type, node.doc).forEach((n) => set.add(n.type + n.doc.id));
    downstreamOf(project, node.type, node.doc).forEach((n) => set.add(n.type + n.doc.id));
    return set;
  }, [sel, nodes, project]);

  const selNode = sel ? nodes.find((n) => n.key === sel) : null;
  const selUp = selNode ? upstreamOf(project, selNode.type, selNode.doc) : [];
  const selDown = selNode ? downstreamOf(project, selNode.type, selNode.doc) : [];
  const selStale = selNode ? staleInfo(project, selNode.type, selNode.doc) : null;

  return (
    <div className="docwrap">
      <h1 className="doch1">Knowledge Graph</h1>
      <p className="docsub">Every artifact and what created it. Click a node to trace its chain — dimmed nodes are unrelated.</p>

      <div className="graphpane">
        <div className="graphscroll">
          <svg width={CHAIN.length * COL_W + PAD} height={height} className="graphsvg" onClick={() => setSel(null)}>
            {CHAIN.map((t, i) => (
              <text key={t} x={PAD + i * COL_W + NODE_W / 2} y={18} className="gcolhead" textAnchor="middle">
                {TYPES[t].icon} {TYPES[t].label}
              </text>
            ))}
            {edges.map((e, i) => {
              const lit = connected && connected.has(e.from.key) && connected.has(e.to.key);
              const x1 = e.from.x + NODE_W, y1 = e.from.y + NODE_H / 2;
              const x2 = e.to.x, y2 = e.to.y + NODE_H / 2;
              const mx = (x1 + x2) / 2;
              return (
                <path key={i} d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                  className={'gedge' + (lit ? ' lit' : connected ? ' dim' : '')} />
              );
            })}
            {nodes.map((n) => {
              const dim = connected && !connected.has(n.key);
              const isSel = sel === n.key;
              const stale = staleInfo(project, n.type, n.doc);
              return (
                <g key={n.key} className={'gnode' + (dim ? ' dim' : '') + (isSel ? ' sel' : '')}
                  transform={`translate(${n.x},${n.y})`}
                  onClick={(ev) => { ev.stopPropagation(); setSel(isSel ? null : n.key); }}>
                  <rect width={NODE_W} height={NODE_H} rx={9} />
                  <text x={10} y={18} className="gtitle">{truncate(n.doc.title, 19)}</text>
                  <text x={10} y={33} className="gsub">{TYPES[n.type].one}{n.type === 'brd' ? ` v${n.doc.versions.length}` : ''}{stale ? ' · ⟳' : ''}</text>
                </g>
              );
            })}
          </svg>
        </div>

        {selNode && (
          <aside className="graphside">
            <p className="doctype">{TYPES[selNode.type].icon} {TYPES[selNode.type].one}</p>
            <h3>{selNode.doc.title}</h3>
            {selStale && <p className="staletag">⟳ Upstream changed — from BRD v{selStale.from}, now v{selStale.current}</p>}
            <p className="railempty">{selUp.length} upstream · {selDown.length} downstream</p>
            {selNode.type !== 'research' && selUp.length > 0 && (
              <p className="graphchain">{selUp.map((n) => TYPES[n.type].icon).join(' → ')} → <b>{TYPES[selNode.type].icon}</b>{selDown.length ? ` → ${selDown.length} artifacts` : ''}</p>
            )}
            <button className="btn" style={{ marginTop: 12 }} onClick={() => nav(`/ai/p/${pid}/${ROUTE_OF[selNode.type]}/${selNode.doc.id}`)}>Open document →</button>
          </aside>
        )}
      </div>
    </div>
  );
}

function buildGraph(project) {
  const nodes = [];
  const byKey = {};
  CHAIN.forEach((t, col) => {
    (project[TYPES[t].key] || []).forEach((doc, row) => {
      const n = { key: t + doc.id, type: t, doc, x: PAD + col * COL_W, y: 34 + row * ROW_H };
      nodes.push(n);
      byKey[n.key] = n;
    });
  });
  const edges = [];
  const link = (fromKey, toKey) => { if (byKey[fromKey] && byKey[toKey]) edges.push({ from: byKey[fromKey], to: byKey[toKey] }); };
  project.brds.forEach((b) => (b.researchIds || []).forEach((rid) => link('research' + rid, 'brd' + b.id)));
  project.pdns.forEach((p) => link('brd' + p.brdId, 'pdn' + p.id));
  project.epics.forEach((e) => link('pdn' + e.pdnId, 'epic' + e.id));
  project.stories.forEach((s) => link('epic' + s.epicId, 'story' + s.id));
  project.frs.forEach((f) => link('story' + f.storyId, 'fr' + f.id));
  project.tests.forEach((t) => link('fr' + t.frId, 'test' + t.id));
  const height = Math.max(220, 50 + Math.max(...CHAIN.map((t) => (project[TYPES[t].key] || []).length), 1) * ROW_H);
  return { nodes, edges, height };
}

const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
