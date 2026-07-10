// Semantic Map — the project's knowledge as the model actually sees it.
// Every document and code chunk is an embedding vector; PCA projects them
// to 2D so semantically close knowledge clusters together. The map grows
// as documents are added and re-indexed.
import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkspace } from './AiPortal';
import { loadIndex, buildIndex, cosine, TYPE_ICON } from './rag';
import { useWS, findProject, usingLocal, shortDate } from './workspace';

const TYPE_COLOR = {
  research: '#c9973b', brd: '#5b9bd5', pdn: '#9b7bd5', epic: '#d57bb0',
  story: '#4ade95', fr: '#3bc9c9', test: '#a3d55b', code: '#e05e6e'
};
const TYPE_LABEL = {
  research: 'Research', brd: 'BRD', pdn: 'PDN', epic: 'Epic',
  story: 'Story', fr: 'Functional req', test: 'Test case', code: 'Source code'
};
const ROUTE_OF = { research: 'research', brd: 'brds', pdn: 'pdns', epic: 'epics', story: 'stories', fr: 'frs', test: 'tests' };

// Top-2 principal components via power iteration — no library needed for
// a few hundred vectors, and it runs in milliseconds.
function pca2d(vectors) {
  const n = vectors.length, d = vectors[0].length;
  const mean = new Array(d).fill(0);
  for (const v of vectors) for (let i = 0; i < d; i++) mean[i] += v[i] / n;
  const X = vectors.map((v) => v.map((x, i) => x - mean[i]));
  const mul = (w) => {
    // (Xᵀ X) w  computed as Xᵀ (X w) — O(n·d) per iteration.
    const proj = X.map((row) => row.reduce((s, x, i) => s + x * w[i], 0));
    const out = new Array(d).fill(0);
    for (let r = 0; r < n; r++) for (let i = 0; i < d; i++) out[i] += X[r][i] * proj[r];
    return out;
  };
  const norm = (w) => { const m = Math.sqrt(w.reduce((s, x) => s + x * x, 0)) || 1; return w.map((x) => x / m); };
  const component = (deflate) => {
    let w = norm(Array.from({ length: d }, () => Math.random() - 0.5));
    for (let it = 0; it < 30; it++) {
      let next = mul(w);
      if (deflate) { const dp = next.reduce((s, x, i) => s + x * deflate[i], 0); next = next.map((x, i) => x - dp * deflate[i]); }
      w = norm(next);
    }
    return w;
  };
  const c1 = component(null);
  const c2 = component(c1);
  return X.map((row) => [row.reduce((s, x, i) => s + x * c1[i], 0), row.reduce((s, x, i) => s + x * c2[i], 0)]);
}

export default function SemanticMapPage() {
  const { pid } = useParams();
  const nav = useNavigate();
  const ws = useWS();
  const { token } = useWorkspace();
  const project = findProject(ws, pid);
  const [version, setVersion] = useState(0);          // bump to reload the index
  const [progress, setProgress] = useState(null);     // {done, total} while building
  const [err, setErr] = useState('');
  const [sel, setSel] = useState(null);

  const idx = useMemo(() => loadIndex(), [version]);  // eslint-disable-line react-hooks/exhaustive-deps
  const current = idx && idx.projectId === pid && idx.items.length > 0 ? idx : null;

  const rebuild = async () => {
    setErr(''); setProgress({ done: 0, total: 1 });
    try {
      await buildIndex({ project, token, local: ws.local, onProgress: (done, total) => setProgress({ done, total }) });
      setVersion((v) => v + 1);
    } catch (e) { setErr(e.message); }
    setProgress(null);
  };

  const layout = useMemo(() => {
    if (!current) return null;
    const pts = pca2d(current.items.map((it) => it.vector));
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const W = 860, H = 560, PAD = 56;
    const nodes = current.items.map((it, i) => ({
      ...it, i,
      x: PAD + ((pts[i][0] - x0) / ((x1 - x0) || 1)) * (W - 2 * PAD),
      y: PAD + ((pts[i][1] - y0) / ((y1 - y0) || 1)) * (H - 2 * PAD)
    }));
    // Constellation edges: each chunk links to its nearest semantic neighbor.
    const edges = nodes.map((a) => {
      let best = -1, bs = -Infinity;
      for (const b of nodes) {
        if (b.i === a.i) continue;
        const s = cosine(a.vector, b.vector);
        if (s > bs) { bs = s; best = b.i; }
      }
      return { from: a.i, to: best, score: bs };
    });
    return { W, H, nodes, edges };
  }, [current]);

  const counts = useMemo(() => {
    if (!current) return {};
    return current.items.reduce((acc, it) => ({ ...acc, [it.type]: (acc[it.type] || 0) + 1 }), {});
  }, [current]);

  const canBuild = !!ws.local?.embedModel;
  const selNode = sel != null && layout ? layout.nodes[sel] : null;
  const neighbors = selNode && layout
    ? layout.nodes.filter((n) => n.i !== selNode.i)
        .map((n) => ({ n, s: cosine(selNode.vector, n.vector) }))
        .sort((a, b) => b.s - a.s).slice(0, 4)
    : [];

  return (
    <div className="docwrap">
      <h1 className="doch1">Semantic Map</h1>
      <p className="docsub">
        Not stored as words — stored as vectors. Each dot is a document or code chunk embedded into {current ? `${current.dims} dimensions` : 'a high-dimensional space'};
        dots that sit close together mean the same thing to the model. Add knowledge, re-index, and watch the map grow.
      </p>

      {!current && !progress && (
        <div className="mapempty">
          <p>No vector index yet for this project.</p>
          {canBuild
            ? <button className="btn gold" onClick={rebuild}>⚡ Build the embedding index</button>
            : <p className="hint">Connect a local embedding model first — Settings → Model Hub → Detect Ollama (needs <code>nomic-embed-text</code>).</p>}
          {usingLocal(ws) || <p className="hint" style={{ marginTop: 8 }}>Tip: the index also builds automatically the first time you ask the local model a question.</p>}
        </div>
      )}

      {progress && (
        <div className="mapempty">
          <p>Embedding {progress.done}/{progress.total} chunks with <code>{ws.local.embedModel}</code>…</p>
          <div className="mapbar"><div style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} /></div>
        </div>
      )}
      {err && <p className="hint" style={{ color: '#e05e6e' }}>{err}</p>}

      {current && layout && !progress && (
        <div className="mappane">
          <div className="mapscroll">
            <svg className="mapsvg" viewBox={`0 0 ${layout.W} ${layout.H}`} width={layout.W} height={layout.H}>
              {layout.edges.map((e, i) => {
                const a = layout.nodes[e.from], b = layout.nodes[e.to];
                const lit = sel === e.from || sel === e.to;
                return <line key={i} className={'mapedge' + (lit ? ' lit' : '')} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeOpacity={lit ? 0.9 : 0.12 + Math.max(0, e.score - 0.5) * 0.5} />;
              })}
              {layout.nodes.map((n) => (
                <g key={n.i} className={'mapnode' + (sel === n.i ? ' sel' : '')} transform={`translate(${n.x},${n.y})`}
                  onClick={() => setSel(sel === n.i ? null : n.i)}>
                  <circle r={sel === n.i ? 9 : 6} fill={TYPE_COLOR[n.type] || '#8ba0ba'} />
                  {sel === n.i && <circle r={14} fill="none" stroke={TYPE_COLOR[n.type]} strokeOpacity="0.5" />}
                </g>
              ))}
            </svg>
          </div>

          <aside className="mapside">
            {selNode ? (
              <>
                <p className="maptype" style={{ color: TYPE_COLOR[selNode.type] }}>{TYPE_ICON(selNode.type)} {TYPE_LABEL[selNode.type]}</p>
                <h3>{selNode.title}</h3>
                <p className="mapexcerpt">{selNode.text.slice(0, 220)}…</p>
                {ROUTE_OF[selNode.type] && (
                  <button className="linkbtn gold" onClick={() => nav(`/ai/p/${pid}/${ROUTE_OF[selNode.type]}/${selNode.refId}`)}>Open document →</button>
                )}
                <p className="maptype" style={{ marginTop: 18 }}>NEAREST IN MEANING</p>
                {neighbors.map(({ n, s }) => (
                  <button key={n.i} className="mapneighbor" onClick={() => setSel(n.i)}>
                    <span style={{ color: TYPE_COLOR[n.type] }}>{TYPE_ICON(n.type)}</span> {n.title}
                    <em>{Math.round(s * 100)}%</em>
                  </button>
                ))}
              </>
            ) : (
              <>
                <h3>{current.items.length} vectors</h3>
                <p className="hint">{current.dims} dimensions · <code>{current.model}</code> · indexed {shortDate(current.builtAt)}</p>
                <div className="maplegend">
                  {Object.entries(counts).map(([t, c]) => (
                    <span key={t}><i style={{ background: TYPE_COLOR[t] }} /> {TYPE_LABEL[t]} · {c}</span>
                  ))}
                </div>
                <p className="hint" style={{ marginTop: 14 }}>Click a dot to see what it is and its nearest semantic neighbors. Lines connect each chunk to the knowledge it's closest to in meaning.</p>
                <button className="linkbtn gold" style={{ marginTop: 10 }} disabled={!canBuild} onClick={rebuild}>↻ Re-index ({current.items.length} → includes new documents)</button>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
