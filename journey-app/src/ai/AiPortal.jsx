// Feasly — an AI product-management workspace. Login + workspace home +
// project shell. Philosophy: navigate knowledge, not folders. The sidebar
// is the artifact chain; the centre is always a document; AI is embedded
// everywhere and additionally reachable through a floating assist panel.
import React, { useState, createContext, useContext } from 'react';
import { useLocation, Routes, Route, NavLink, Navigate, useParams, useNavigate } from 'react-router-dom';
import { ai } from '../lib/api';
import { useWS, findProject, TYPES } from './workspace';
import HomePage from './HomePage';
import ResearchPage from './ResearchPage';
import ConversationsPage from './ConversationsPage';
import BrdsPage from './BrdsPage';
import ArtifactPage from './ArtifactPage';
import GraphPage from './GraphPage';
import ReleasesPage from './ReleasesPage';
import SettingsPage from './SettingsPage';
import AssistPanel from './AssistPanel';

const WorkspaceContext = createContext(null);
export const useWorkspace = () => useContext(WorkspaceContext);

export default function AiPortal() {
  const [token, setToken] = useState(null);
  const fromJourney = useLocation().search.includes('from=journey');
  if (!token) return <Login onToken={setToken} autoLogin={fromJourney} />;
  return (
    <WorkspaceContext.Provider value={{ token, logout: () => setToken(null) }}>
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="p/:pid/*" element={<ProjectShell />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </WorkspaceContext.Provider>
  );
}

function Login({ onToken, autoLogin }) {
  // Demo-grade credentials are public, so prefill them — one click to enter.
  const [u, setU] = useState('pm'); const [p, setP] = useState('zenith@123'); const [err, setErr] = useState('');
  const go = async (user = u, pass = p) => {
    try { const r = await ai.login(user, pass); onToken(r.token); }
    catch { setErr('Invalid credentials. Demo login: pm / zenith@123'); }
  };
  React.useEffect(() => { if (autoLogin) go('pm', 'zenith@123'); /* eslint-disable-line */ }, [autoLogin]);
  return (
    <div className="page narrow dark">
      <div>
        <h2>Feasly <span className="accent">· PM workspace</span></h2>
        <p className="hint">Research, BRDs, PDNs, epics, stories and test cases — interconnected, versioned, and traceable back to the business question. Connected to the Zenith showcase tenant.</p>
        <label>Username</label><input value={u} onChange={e => setU(e.target.value)} />
        <label>Password</label><input type="password" value={p} onChange={e => setP(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} />
        {err && <p className="error">{err}</p>}
        <button className="btn" onClick={() => go()}>Login</button>
        <p className="hint">Demo credentials prefilled: <code>pm / zenith@123</code></p>
      </div>
    </div>
  );
}

// Sidebar groups — the artifact chain reads top-to-bottom like the workflow.
const NAV = [
  { group: 'Knowledge', items: [
    { to: 'research', icon: TYPES.research.icon, label: 'Research', count: (p) => p.research.length },
    { to: 'conversations', icon: '💬', label: 'Conversations', count: (p) => p.conversations.length }
  ] },
  { group: 'Delivery', items: [
    { to: 'brds', icon: TYPES.brd.icon, label: 'BRDs', count: (p) => p.brds.length },
    { to: 'pdns', icon: TYPES.pdn.icon, label: 'PDNs', count: (p) => p.pdns.length },
    { to: 'epics', icon: TYPES.epic.icon, label: 'Epics', count: (p) => p.epics.length },
    { to: 'stories', icon: TYPES.story.icon, label: 'User Stories', count: (p) => p.stories.length },
    { to: 'frs', icon: TYPES.fr.icon, label: 'Functional Reqs', count: (p) => p.frs.length },
    { to: 'tests', icon: TYPES.test.icon, label: 'Test Cases', count: (p) => p.tests.length }
  ] },
  { group: 'Project', items: [
    { to: 'graph', icon: '🕸', label: 'Knowledge Graph' },
    { to: 'releases', icon: '🚀', label: 'Releases', count: (p) => p.releases.length },
    { to: 'settings', icon: '⚙️', label: 'Settings' }
  ] }
];

function ProjectShell() {
  const { pid } = useParams();
  const nav = useNavigate();
  const ws = useWS();
  const { logout } = useWorkspace();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const project = findProject(ws, pid);
  if (!project) return <Navigate to="/ai" replace />;

  return (
    <div className="workspace">
      <button className="ws-hamburger" onClick={() => setDrawerOpen(true)} aria-label="Open menu">☰</button>
      {drawerOpen && <div className="ws-backdrop" onClick={() => setDrawerOpen(false)} />}

      <aside className={'ws-side' + (drawerOpen ? ' open' : '')}>
        <div className="ws-sidetop">
          <div className="ws-brand">feasly<span className="accent">.</span></div>
          <button className="ws-drawerclose" onClick={() => setDrawerOpen(false)} aria-label="Close menu">✕</button>
        </div>
        <button className="ws-projname" onClick={() => nav('/ai')} title="Back to all projects">
          <span className="ws-projback">←</span> {project.name}
        </button>

        {NAV.map((g) => (
          <React.Fragment key={g.group}>
            <div className="ws-grouplbl">{g.group}</div>
            <nav className="ws-nav">
              {g.items.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) => 'ws-link' + (isActive ? ' on' : '')}>
                  <span className="ws-icon">{item.icon}</span> {item.label}
                  {item.count && <span className="ws-count">{item.count(project)}</span>}
                </NavLink>
              ))}
            </nav>
          </React.Fragment>
        ))}

        <div style={{ flex: 1 }} />
        <div className="ws-foot">
          <div className="ws-user"><span className="ws-avatar">PM</span> pm@zenith · demo</div>
          <button className="linkbtn" onClick={() => { logout(); nav('/ai'); }}>Log out</button>
        </div>
      </aside>

      <main className="ws-main page dark">
        <Routes>
          <Route index element={<Navigate to="research" replace />} />
          <Route path="research/:docId?" element={<ResearchPage />} />
          <Route path="conversations/:convId?" element={<ConversationsPage />} />
          <Route path="brds/:docId?" element={<BrdsPage />} />
          <Route path="pdns/:docId?" element={<ArtifactPage type="pdn" />} />
          <Route path="epics/:docId?" element={<ArtifactPage type="epic" />} />
          <Route path="stories/:docId?" element={<ArtifactPage type="story" />} />
          <Route path="frs/:docId?" element={<ArtifactPage type="fr" />} />
          <Route path="tests/:docId?" element={<ArtifactPage type="test" />} />
          <Route path="graph" element={<GraphPage />} />
          <Route path="releases" element={<ReleasesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="research" replace />} />
        </Routes>
      </main>

      <AssistPanel project={project} />
    </div>
  );
}
