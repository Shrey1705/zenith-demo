// The right-hand rail every document carries: where it came from (upstream),
// what was generated from it (downstream), and the AI actions that operate
// on this document. Quiet typography — links, not cards.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TYPES, ROUTE_OF, upstreamOf, downstreamOf } from './workspace';

export default function TraceRail({ project, type, doc, actions, extra }) {
  const nav = useNavigate();
  const up = upstreamOf(project, type, doc);
  const down = downstreamOf(project, type, doc);
  const open = (t, d) => nav(`/ai/p/${project.id}/${ROUTE_OF[t]}/${d.id}`);

  return (
    <aside className="tracerail">
      {actions && actions.length > 0 && (
        <section>
          <h4>✦ AI actions</h4>
          {actions.map((a) => (
            <button key={a.label} className="railaction" disabled={a.disabled} onClick={a.run} title={a.hint}>
              {a.label}{a.done ? ' ✓' : ''}
            </button>
          ))}
        </section>
      )}

      <section>
        <h4>Upstream</h4>
        {up.length === 0 && <p className="railempty">This is a source document — nothing above it.</p>}
        {up.map(({ type: t, doc: d }) => (
          <button key={t + d.id} className="raillink" onClick={() => open(t, d)}>
            <span className="railicon">{TYPES[t].icon}</span>
            <span className="railtitle">{d.title}</span>
            <span className="railtype">{TYPES[t].one}{t === 'brd' ? ` · v${d.versions.length}` : ''}</span>
          </button>
        ))}
      </section>

      <section>
        <h4>Downstream</h4>
        {down.length === 0 && <p className="railempty">Nothing generated from this yet.</p>}
        {down.slice(0, 12).map(({ type: t, doc: d }) => (
          <button key={t + d.id} className="raillink" onClick={() => open(t, d)}>
            <span className="railicon">{TYPES[t].icon}</span>
            <span className="railtitle">{d.title}</span>
            <span className="railtype">{TYPES[t].one}</span>
          </button>
        ))}
        {down.length > 12 && <p className="railempty">…and {down.length - 12} more — see the Knowledge Graph.</p>}
      </section>

      {extra}
    </aside>
  );
}

// Shared stale banner — shown on any document whose source BRD moved on.
export function StaleBanner({ project, stale, onRegenerate }) {
  const nav = useNavigate();
  if (!stale) return null;
  return (
    <div className="stalebar">
      <span>
        ⟳ Upstream changed — generated from <b>BRD v{stale.from}</b>, but{' '}
        <button className="stalelink" onClick={() => nav(`/ai/p/${project.id}/brds/${stale.brd.id}`)}>{stale.brd.title}</button>{' '}
        is now at <b>v{stale.current}</b>. Review for drift.
      </span>
      {onRegenerate && <button className="stalefix" onClick={onRegenerate}>Regenerate from v{stale.current}</button>}
    </div>
  );
}
