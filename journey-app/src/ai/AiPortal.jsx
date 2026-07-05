// Feasly — the PM workspace. Login + app shell (grouped left nav, mobile
// slide-in drawer) + nested pages. Zenith Health is the connected showcase
// tenant; the workspace answers "is this feasible?" from its actual code,
// plus everyday PM craft (BRDs, planner, model routing).
import React, { useState, createContext, useContext } from 'react';
import { useLocation, useNavigate, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { ai } from '../lib/api';
import DashboardPage from './DashboardPage';
import ProjectsPage from './ProjectsPage';
import ProjectDetailPage from './ProjectDetailPage';
import BrdPage from './BrdPage';
import AskFeaslyPage from './AskFeaslyPage';
import PlannerPage from './PlannerPage';
import SettingsPage from './SettingsPage';

const WorkspaceContext = createContext(null);
export const useWorkspace = () => useContext(WorkspaceContext);

const NAV_WORKSPACE = [
  { to: '', icon: '🏠', label: 'Dashboard', end: true },
  { to: 'projects', icon: '📁', label: 'Projects' },
  { to: 'ask', icon: '💬', label: 'Ask Feasly' },
  { to: 'planner', icon: '🗓', label: 'Planner' }
];
const NAV_ADMIN = [{ to: 'settings', icon: '⚙️', label: 'Settings' }];

export default function AiPortal() {
  const [token, setToken] = useState(null);
  const fromJourney = useLocation().search.includes('from=journey');
  if (!token) return <Login onToken={setToken} autoLogin={fromJourney} />;
  return <Workspace token={token} onLogout={() => setToken(null)} fromJourney={fromJourney} />;
}

function Login({ onToken, autoLogin }) {
  // Demo-grade credentials are public, so prefill them — one click to enter.
  const [u, setU] = useState('pm'); const [p, setP] = useState('zenith@123'); const [err, setErr] = useState('');
  const go = async (user = u, pass = p) => {
    try { const r = await ai.login(user, pass); onToken(r.token); }
    catch { setErr('Invalid credentials. Demo login: pm / zenith@123'); }
  };
  // Arriving from the journey's success screen: log straight in.
  React.useEffect(() => { if (autoLogin) go('pm', 'zenith@123'); /* eslint-disable-line */ }, [autoLogin]);
  return (
    <div className="page narrow dark">
      <div>
        <h2>Feasly <span className="accent">· PM workspace</span></h2>
        <p className="hint">Feasibility verdicts grounded in live code, PDN drafting, stories, test cases, and a PM copilot — connected to the Zenith showcase tenant.</p>
        <label>Username</label><input value={u} onChange={e => setU(e.target.value)} />
        <label>Password</label><input type="password" value={p} onChange={e => setP(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} />
        {err && <p className="error">{err}</p>}
        <button className="btn" onClick={() => go()}>Login</button>
        <p className="hint">Demo credentials prefilled: <code>pm / zenith@123</code></p>
      </div>
    </div>
  );
}

function NavLinks({ onNavigate }) {
  return (
    <>
      <div className="ws-grouplbl">Workspace</div>
      <nav className="ws-nav">
        {NAV_WORKSPACE.map((item) => (
          <NavLink key={item.label} to={item.to} end={item.end} onClick={onNavigate} className={({ isActive }) => 'ws-link' + (isActive ? ' on' : '')}>
            <span className="ws-icon">{item.icon}</span> {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="ws-grouplbl">Admin</div>
      <nav className="ws-nav">
        {NAV_ADMIN.map((item) => (
          <NavLink key={item.label} to={item.to} onClick={onNavigate} className={({ isActive }) => 'ws-link' + (isActive ? ' on' : '')}>
            <span className="ws-icon">{item.icon}</span> {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

function Workspace({ token, onLogout, fromJourney }) {
  const nav = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <WorkspaceContext.Provider value={{ token }}>
      <div className="workspace">
        <button className="ws-hamburger" onClick={() => setDrawerOpen(true)} aria-label="Open menu">☰</button>
        {drawerOpen && <div className="ws-backdrop" onClick={() => setDrawerOpen(false)} />}

        <aside className={'ws-side' + (drawerOpen ? ' open' : '')}>
          <div className="ws-sidetop">
            <div className="ws-brand">feasly<span className="accent">.</span></div>
            <button className="ws-drawerclose" onClick={() => setDrawerOpen(false)} aria-label="Close menu">✕</button>
          </div>
          <div className="ws-tenant">Tenant: <b>Zenith Health</b> · showcase</div>
          <NavLinks onNavigate={() => setDrawerOpen(false)} />
          <div style={{ flex: 1 }} />
          <div className="ws-foot">
            <div className="ws-user"><span className="ws-avatar">PM</span> pm@zenith · demo</div>
            <button className="linkbtn" onClick={() => { onLogout(); nav('/ai'); }}>Log out</button>
          </div>
        </aside>

        <main className="ws-main page dark">
          <Routes>
            <Route index element={fromJourney ? <Navigate to="projects" replace /> : <DashboardPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:projectId" element={<ProjectDetailPage />} />
            <Route path="projects/:projectId/:brdId" element={<BrdPage />} />
            <Route path="ask" element={<AskFeaslyPage />} />
            <Route path="planner" element={<PlannerPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="chat" element={<Navigate to="../ask" replace />} />
            <Route path="feasibility" element={<Navigate to="../projects" replace />} />
            <Route path="research" element={<Navigate to="../projects" replace />} />
            <Route path="models" element={<Navigate to="../settings" replace />} />
            <Route path="systems" element={<Navigate to="../settings" replace />} />
            <Route path="api" element={<Navigate to="../settings" replace />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Routes>
        </main>
      </div>
    </WorkspaceContext.Provider>
  );
}
