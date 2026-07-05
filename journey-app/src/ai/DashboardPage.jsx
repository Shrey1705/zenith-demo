// Dashboard — home base. Orients the PM in seconds: what's in flight, what
// to do next. Quick-start cards jump straight into Ask Feasly or a fresh BRD.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadWS, saveWS, newBrd, DOT } from './workspace';

const todayLine = () => new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });

export default function DashboardPage() {
  const nav = useNavigate();
  const [ws] = useState(loadWS);

  const quickNewBrd = () => {
    const p = ws.projects[0];
    if (!p) return nav('projects');
    const brd = newBrd('New requirement');
    const next = saveWS({ ...ws, projects: ws.projects.map((pr) => (pr.id === p.id ? { ...pr, brds: [brd, ...pr.brds] } : pr)) });
    void next;
    nav(`projects/${p.id}/${brd.id}`);
  };

  const projectCards = ws.projects.map((p) => ({ ...p, brdCount: p.brds.length }));

  const recentArtifacts = [];
  ws.projects.forEach((p) => p.brds.forEach((b) => {
    if (b.status === 'generated' && b.analysis) {
      recentArtifacts.push({ key: b.id + '-v', icon: '🚦', type: 'Verdict', title: b.title, dot: DOT[b.analysis.overall] || '✓', goto: () => nav(`projects/${p.id}/${b.id}`) });
      recentArtifacts.push({ key: b.id + '-p', icon: '📄', type: 'PDN', title: b.title, dot: DOT[b.analysis.overall] || '✓', goto: () => nav(`projects/${p.id}/${b.id}`) });
    }
  }));

  return (
    <div>
      <div className="dashhead">
        <div>
          <h1 className="dashh1">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, PM</h1>
          <p className="dashsub">{todayLine()} · Zenith Health workspace</p>
        </div>
      </div>

      <div className="quickgrid">
        <button className="quickcard" onClick={() => nav('ask')}>
          <span className="quickicon">💬</span>
          <span>
            <span className="quicktitle">Ask Feasly a question</span>
            <span className="quickdesc">Get a code-grounded answer in seconds — "can we offer monthly EMI?"</span>
          </span>
        </button>
        <button className="quickcard" onClick={quickNewBrd}>
          <span className="quickicon">📝</span>
          <span>
            <span className="quicktitle">Start a new BRD</span>
            <span className="quickdesc">Capture requirements, lock it, then generate PDN, stories &amp; tests</span>
          </span>
        </button>
      </div>

      <div className="dashcols">
        <div>
          <div className="dashsecthead">
            <h3>Projects</h3>
            <button className="linkbtn gold" onClick={() => nav('projects')}>View all →</button>
          </div>
          <div className="dashlist">
            {projectCards.map((p) => (
              <button className="dashrow" key={p.id} onClick={() => nav(`projects/${p.id}`)}>
                <span>
                  <span className="dashrowtitle">📁 {p.name}</span>
                  <span className="dashrowsub">{p.about}</span>
                </span>
                <span className="countpill">{p.brdCount} BRDs</span>
              </button>
            ))}
            {!projectCards.length && <p className="hint">No projects yet — create one to start a BRD.</p>}
          </div>

          <h3 style={{ marginTop: 28 }}>Recent artifacts</h3>
          <div className="dashlist">
            {recentArtifacts.slice(0, 4).map((a) => (
              <button className="artrow" key={a.key} onClick={a.goto}>
                <span className="artrowleft">
                  <span>{a.icon}</span>
                  <span className="artrowtext">
                    <span className="artrowtitle">{a.type} · {a.title}</span>
                    <span className="artrowtime">today</span>
                  </span>
                </span>
                <span>{a.dot}</span>
              </button>
            ))}
            {!recentArtifacts.length && <p className="hint">Nothing generated yet — lock a BRD and generate to see artifacts here.</p>}
          </div>
        </div>

        <div>
          <h3>Recent activity</h3>
          <div className="activitypanel">
            {(ws.activity || []).map((ev, i) => (
              <div className="activityrow" key={i}>
                <span>{ev.icon}</span>
                <span>
                  <span className="activitytext">{ev.text}</span>
                  <span className="activitytime">{ev.time}</span>
                </span>
              </div>
            ))}
          </div>

          <h3>Connected systems</h3>
          <div className="syshealth">
            <div className="syshealthrow"><span>🔌 zenith-core-service</span><span className="status issued">CONNECTED</span></div>
            <div className="syshealthrow"><span>🔌 zenith-journey-app</span><span className="status issued">CONNECTED</span></div>
            <p className="hint" style={{ marginTop: 6 }}>Last re-indexed 1 hr ago · read-only connectors</p>
          </div>
        </div>
      </div>
    </div>
  );
}
