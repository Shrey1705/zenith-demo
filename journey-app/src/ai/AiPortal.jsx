// Feasly — the PM workspace. Login + app shell (left nav) + nested pages.
// Zenith Health is the connected showcase tenant; the workspace answers
// "is this feasible?" from its actual code, plus everyday PM craft.
import React, { useState, useEffect, createContext, useContext } from 'react';
import { useLocation, useNavigate, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { ai } from '../lib/api';
import ChatsPage from './ChatsPage';
import StudioPage from './StudioPage';
import ProjectsPage from './ProjectsPage';
import ResearchPage from './ResearchPage';
import PlannerPage from './PlannerPage';
import ModelsPage from './ModelsPage';
import { SystemsPage, ApiKeysPage } from './pages';

const ANALYSIS_KEY = 'feasly-last-analysis';

const WorkspaceContext = createContext(null);
export const useWorkspace = () => useContext(WorkspaceContext);

const NAV = [
  { to: 'chat', icon: '💬', label: 'Chats' },
  { to: 'feasibility', icon: '🚦', label: 'Feasibility Studio' },
  { to: 'projects', icon: '📁', label: 'Projects' },
  { to: 'research', icon: '🔭', label: 'Research' },
  { to: 'planner', icon: '🗓', label: 'Planner' },
  { to: 'models', icon: '🧠', label: 'Model Hub' },
  { to: 'systems', icon: '🔌', label: 'Connected Systems' },
  { to: 'api', icon: '🔑', label: 'API & Webhooks' }
];

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
  useEffect(() => { if (autoLogin) go('pm', 'zenith@123'); /* eslint-disable-line */ }, [autoLogin]);
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

function Workspace({ token, onLogout, fromJourney }) {
  const nav = useNavigate();
  // Last analysis survives page switches and the journey handoff.
  const [analysis, setAnalysisState] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(ANALYSIS_KEY)) || null; } catch { return null; }
  });
  const setAnalysis = (a) => {
    setAnalysisState(a);
    try { sessionStorage.setItem(ANALYSIS_KEY, JSON.stringify(a)); } catch { /* ignore */ }
  };

  return (
    <WorkspaceContext.Provider value={{ token, analysis, setAnalysis }}>
      <div className="workspace">
        <aside className="ws-side">
          <div className="ws-brand">feasly<span className="accent">.</span></div>
          <div className="ws-tenant">Tenant: <b>Zenith Health</b> · showcase</div>
          <nav className="ws-nav">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => 'ws-link' + (isActive ? ' on' : '')}>
                <span className="ws-icon">{item.icon}</span> {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ws-foot">
            <div className="ws-user"><span className="ws-avatar">PM</span> pm@zenith · demo</div>
            <button className="linkbtn" onClick={() => { onLogout(); nav('/ai'); }}>Log out</button>
          </div>
        </aside>
        <main className="ws-main page dark">
          <Routes>
            <Route index element={<Navigate to={fromJourney ? 'feasibility' : 'chat'} replace />} />
            <Route path="chat" element={<ChatsPage />} />
            <Route path="feasibility" element={<StudioPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="research" element={<ResearchPage />} />
            <Route path="planner" element={<PlannerPage />} />
            <Route path="models" element={<ModelsPage />} />
            <Route path="systems" element={<SystemsPage />} />
            <Route path="api" element={<ApiKeysPage />} />
            <Route path="pdn" element={<Navigate to="../feasibility" replace />} />
            <Route path="stories" element={<Navigate to="../feasibility" replace />} />
            <Route path="tests" element={<Navigate to="../feasibility" replace />} />
            <Route path="*" element={<Navigate to="chat" replace />} />
          </Routes>
        </main>
      </div>
    </WorkspaceContext.Provider>
  );
}
