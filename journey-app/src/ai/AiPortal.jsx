// Feasly — an AI product-management workspace, in a light "liquid glass"
// design language. One persistent shell: a floating translucent sidebar
// where everything nests (Chats, Products → Projects → the artifact chain,
// Recent), a chat-first landing, and a computed lifecycle stage on every
// project. Theme colors are user tokens.
import React, { useState, createContext, useContext } from 'react';
import { useLocation, Routes, Route, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { ai } from '../lib/api';
import {
  useWS, mutate, resetWS, uid, now, findProject, findProduct, projectsOf,
  ALL_PRODUCT, DEFAULT_THEME, TYPES, ROUTE_OF
} from './workspace';
import { I, TypeIcon } from './icons';
import ChatHome from './ChatHome';
import ProductPage from './ProductPage';
import StageStrip from './StageStrip';
import ResearchPage from './ResearchPage';
import ConversationsPage from './ConversationsPage';
import LibraryPage from './LibraryPage';
import BrdsPage from './BrdsPage';
import ArtifactPage from './ArtifactPage';
import GraphPage from './GraphPage';
import SemanticMapPage from './SemanticMapPage';
import ReleasesPage from './ReleasesPage';
import PlaybooksPage from './PlaybooksPage';
import SettingsPage from './SettingsPage';
import AssistPanel from './AssistPanel';
import DemoCoach, { startCoach } from './DemoCoach';

const WorkspaceContext = createContext(null);
export const useWorkspace = () => useContext(WorkspaceContext);

// Theme variables flow from the store so Appearance changes apply live.
function themeVars(ws) {
  const t = ws.theme || DEFAULT_THEME;
  return { '--p': t.primary, '--s': t.secondary, '--t': t.tertiary };
}

export default function AiPortal() {
  const [token, setToken] = useState(null);
  const ws = useWS();
  const fromJourney = useLocation().search.includes('from=journey');
  if (!token) return <div className="fs-root" style={themeVars(ws)}><Login onToken={setToken} autoLogin={fromJourney} /></div>;
  return (
    <div className="fs-root" style={themeVars(ws)}>
      <WorkspaceContext.Provider value={{ token, logout: () => setToken(null) }}>
        <DemoCoach />
        <Routes>
          <Route path="/" element={<Shell />}>
            <Route index element={<ChatHome />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="prod/:prodId" element={<ProductPage />} />
            <Route path="p/:pid/*" element={<ProjectRoutes />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Route>
        </Routes>
      </WorkspaceContext.Provider>
    </div>
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
    <div className="fs-loginwrap">
      <div className="fs-login">
        <div className="fs-loginbrand"><I n="sparkle" s={22} style={{ color: 'var(--p)' }} /> <b>feasly</b></div>
        <h2>PM workspace</h2>
        <p className="hint">Research, BRDs, PDNs, stories and tests — interconnected, versioned, and traceable back to the business question. Connected to the Zenith showcase tenant.</p>
        <label>Username</label><input value={u} onChange={e => setU(e.target.value)} />
        <label>Password</label><input type="password" value={p} onChange={e => setP(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} />
        {err && <p className="error">{err}</p>}
        <button className="btn" onClick={() => go()}>Log in</button>
        <p className="hint">Demo credentials prefilled: <code>pm / zenith@123</code></p>
      </div>
    </div>
  );
}

// ---- shared shell: floating sidebar + content pane ----
function Shell() {
  const ws = useWS();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pid = location.pathname.match(/\/ai\/p\/([^/]+)/)?.[1] || null;
  const project = pid ? findProject(ws, pid) : null;

  return (
    <div className="workspace">
      <button className="ws-hamburger" onClick={() => setDrawerOpen(true)} aria-label="Open menu"><I n="chevronLeft" s={17} style={{ transform: 'rotate(180deg)' }} /></button>
      {drawerOpen && <div className="ws-backdrop" onClick={() => setDrawerOpen(false)} />}
      <Sidebar project={project} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <main className="ws-main">
        {project && <StageStrip project={project} />}
        <Outlet />
      </main>
      {project && <AssistPanel project={project} />}
    </div>
  );
}

function ProjectRoutes() {
  const location = useLocation();
  const ws = useWS();
  const pid = location.pathname.match(/\/ai\/p\/([^/]+)/)?.[1];
  if (!findProject(ws, pid)) return <Navigate to="/ai" replace />;
  return (
    <Routes>
      <Route index element={<Navigate to="research" replace />} />
      <Route path="research/:docId?" element={<ResearchPage />} />
      <Route path="conversations/:convId?" element={<ConversationsPage />} />
      <Route path="library" element={<LibraryPage />} />
      <Route path="brds/:docId?" element={<BrdsPage />} />
      <Route path="pdns/:docId?" element={<ArtifactPage type="pdn" />} />
      <Route path="epics/:docId?" element={<ArtifactPage type="epic" />} />
      <Route path="stories/:docId?" element={<ArtifactPage type="story" />} />
      <Route path="frs/:docId?" element={<ArtifactPage type="fr" />} />
      <Route path="tests/:docId?" element={<ArtifactPage type="test" />} />
      <Route path="playbooks" element={<PlaybooksPage />} />
      <Route path="graph" element={<GraphPage />} />
      <Route path="map" element={<SemanticMapPage />} />
      <Route path="releases" element={<ReleasesPage />} />
      <Route path="settings" element={<Navigate to="/ai/settings" replace />} />
      <Route path="*" element={<Navigate to="research" replace />} />
    </Routes>
  );
}

// ---- collapsible sidebar group ----
const navState = () => { try { return JSON.parse(localStorage.getItem('fs-nav') || '{}'); } catch { return {}; } };
const setNavState = (id, v) => { try { const m = navState(); m[id] = v; localStorage.setItem('fs-nav', JSON.stringify(m)); } catch { /* ignore */ } };

function Group({ id, label, action, children, small }) {
  const [open, setOpen] = useState(() => navState()[id] ?? true);
  const toggle = () => { const v = !open; setOpen(v); setNavState(id, v); };
  return (
    <div className={'fs-group' + (small ? ' small' : '')}>
      <div className="fs-grouphead">
        <button className="fs-grouptoggle" onClick={toggle}>
          <I n="chevronDown" s={11} className={open ? '' : 'closed'} /> <span>{label}</span>
        </button>
        {action}
      </div>
      {open && <div className="fs-groupbody">{children}</div>}
    </div>
  );
}

// The project's own tree — nested under the active project row.
const PROJECT_NAV = [
  { g: 'knowledge', label: 'Knowledge', items: [
    { to: 'research', glyph: 'book', label: 'Research', count: (p) => p.research.length },
    { to: 'conversations', glyph: 'message', label: 'Conversations', count: (p) => p.conversations.length },
    { to: 'library', glyph: 'archive', label: 'Library' }
  ] },
  { g: 'delivery', label: 'Delivery', items: [
    { to: 'brds', glyph: 'clipboard', label: 'BRDs', count: (p) => p.brds.length },
    { to: 'pdns', glyph: 'file', label: 'PDNs', count: (p) => p.pdns.length },
    { to: 'epics', glyph: 'layers', label: 'Epics', count: (p) => p.epics.length },
    { to: 'stories', glyph: 'card', label: 'User Stories', count: (p) => p.stories.length },
    { to: 'frs', glyph: 'checks', label: 'Functional Reqs', count: (p) => p.frs.length },
    { to: 'tests', glyph: 'flask', label: 'Test Cases', count: (p) => p.tests.length }
  ] },
  { g: 'project', label: 'Project', items: [
    { to: 'playbooks', glyph: 'play', label: 'Playbooks' },
    { to: 'graph', glyph: 'network', label: 'Knowledge Graph' },
    { to: 'map', glyph: 'scatter', label: 'Semantic Map' },
    { to: 'releases', glyph: 'rocket', label: 'Releases', count: (p) => p.releases.length }
  ] }
];

// One product in the sidebar: chevron collapses its projects, the name opens
// its dashboard, + starts a project inside it.
function ProductNode({ product, activeProject, onClose }) {
  const ws = useWS();
  const nav = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(() => navState()['prod-' + product.id] ?? true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const projects = projectsOf(ws, product.id);
  const onDash = location.pathname === `/ai/prod/${product.id}`;
  const toggle = () => { const v = !open; setOpen(v); setNavState('prod-' + product.id, v); };

  const createProject = () => {
    if (!name.trim()) { setAdding(false); return; }
    const p = { id: uid(), name: name.trim(), about: '', productId: product.id, createdAt: now(), folders: [], research: [], conversations: [], brds: [], pdns: [], epics: [], stories: [], frs: [], tests: [], releases: [] };
    mutate((w) => ({ ...w, projects: [p, ...w.projects] }));
    setName(''); setAdding(false);
    nav(`/ai/p/${p.id}/research`);
  };

  return (
    <div className="fs-prodnode">
      <div className={'fs-prodrow' + (onDash ? ' on' : '')}>
        <button className="fs-prodchev" onClick={toggle} aria-label="Toggle projects">
          <I n="chevronDown" s={10} className={open ? '' : 'closed'} />
        </button>
        <button className="fs-prodname" onClick={() => { nav(`/ai/prod/${product.id}`); onClose(); }}>
          <I n={product.id === 'all' ? 'layers' : 'target'} s={14} />
          <span className="fs-linklabel">{product.name}</span>
        </button>
        <button className="fs-groupaction" title={`New project in ${product.name}`} onClick={() => { setOpen(true); setNavState('prod-' + product.id, true); setAdding(true); }}><I n="plus" s={12} /></button>
      </div>
      {open && (
        <div className="fs-prodkids">
          {adding && (
            <div className="fs-newproj">
              <input autoFocus value={name} placeholder="Project name…" onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') createProject(); if (e.key === 'Escape') setAdding(false); }}
                onBlur={() => (name.trim() ? createProject() : setAdding(false))} />
            </div>
          )}
          {projects.map((p) => (
            <div key={p.id}>
              <button className={'fs-link' + (activeProject?.id === p.id ? ' cur' : '')} onClick={() => { nav(`/ai/p/${p.id}/research`); }}>
                <I n="folder" s={14} style={activeProject?.id === p.id ? { color: 'var(--p)' } : undefined} />
                <span className="fs-linklabel">{p.name}</span>
              </button>
              {activeProject?.id === p.id && (
                <div className="fs-tree">
                  {PROJECT_NAV.map((g) => (
                    <Group key={g.g} id={g.g} label={g.label} small>
                      {g.items.map((item) => (
                        <NavLink key={item.to} to={`/ai/p/${p.id}/${item.to}`} onClick={onClose}
                          className={({ isActive }) => 'fs-link sub' + (isActive ? ' on' : '')}>
                          <I n={item.glyph} s={14} />
                          <span className="fs-linklabel">{item.label}</span>
                          {item.count ? <span className="fs-count">{item.count(p)}</span> : null}
                        </NavLink>
                      ))}
                    </Group>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!projects.length && !adding && <p className="fs-empty">No projects yet.</p>}
        </div>
      )}
    </div>
  );
}

function Sidebar({ project, open, onClose }) {
  const ws = useWS();
  const nav = useNavigate();
  const { logout } = useWorkspace();
  const [addingProduct, setAddingProduct] = useState(false);
  const [prodName, setProdName] = useState('');

  const createProduct = () => {
    if (!prodName.trim()) { setAddingProduct(false); return; }
    const p = { id: uid(), name: prodName.trim(), about: '', createdAt: now() };
    mutate((w) => ({ ...w, products: [...(w.products || []), p] }));
    setProdName(''); setAddingProduct(false);
    nav(`/ai/prod/${p.id}`);
  };

  // Recent documents across every project, newest first.
  const recent = ws.projects.flatMap((p) =>
    Object.keys(TYPES).flatMap((t) => (p[TYPES[t].key] || []).map((d) => ({ p, t, d })))
  ).sort((a, b) => (b.d.createdAt || '').localeCompare(a.d.createdAt || '')).slice(0, 5);

  return (
    <aside className={'ws-side' + (open ? ' open' : '')}>
      <div className="ws-sidetop">
        <NavLink to="/ai" end className="ws-brand"><I n="sparkle" s={17} style={{ color: 'var(--p)' }} /> feasly</NavLink>
        <button className="ws-drawerclose" onClick={onClose} aria-label="Close menu"><I n="x" s={16} /></button>
      </div>

      <div className="fs-nav">
        <button className="fs-link home" onClick={() => { mutate((w) => ({ ...w, activeSessionId: null })); nav('/ai'); onClose(); }}>
          <I n="pen" s={14} /> New chat
        </button>

        <Group id="chats" label="Chats">
          {(ws.sessions || []).slice(0, 6).map((s) => (
            <button key={s.id} className={'fs-link' + (ws.activeSessionId === s.id ? ' cur' : '')}
              onClick={() => { mutate((w) => ({ ...w, activeSessionId: s.id })); nav('/ai'); onClose(); }}>
              <I n="message" s={14} />
              <span className="fs-linklabel">{s.title}</span>
              {s.projectId && <I n="folder" s={11} style={{ color: 'var(--p)', opacity: 0.7 }} />}
            </button>
          ))}
          {!(ws.sessions || []).length && <p className="fs-empty">Your chats appear here, auto-named.</p>}
        </Group>

        <Group id="products" label="Products"
          action={<button className="fs-groupaction" title="New product" onClick={() => setAddingProduct(true)}><I n="plus" s={13} /></button>}>
          {addingProduct && (
            <div className="fs-newproj">
              <input autoFocus value={prodName} placeholder="Product name…" onChange={(e) => setProdName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') createProduct(); if (e.key === 'Escape') setAddingProduct(false); }}
                onBlur={() => (prodName.trim() ? createProduct() : setAddingProduct(false))} />
            </div>
          )}
          {(ws.products || []).map((prod) => (
            <ProductNode key={prod.id} product={prod} activeProject={project} onClose={onClose} />
          ))}
          <ProductNode product={ALL_PRODUCT} activeProject={project} onClose={onClose} />
        </Group>

        <Group id="recent" label="Recent">
          {recent.map(({ p, t, d }) => (
            <button key={t + d.id} className="fs-link" onClick={() => { nav(`/ai/p/${p.id}/${ROUTE_OF[t]}/${d.id}`); onClose(); }}>
              <TypeIcon type={t} s={13} />
              <span className="fs-linklabel">{d.title}</span>
            </button>
          ))}
          {!recent.length && <p className="fs-empty">Documents you create appear here.</p>}
        </Group>
      </div>

      <div className="ws-foot">
        <div className="ws-user"><span className="ws-avatar">PM</span><span>pm@zenith · demo</span></div>
        <button className="fs-footbtn" onClick={startCoach}><I n="play" s={12} /> Guided demo</button>
        <button className="fs-footbtn" onClick={() => { if (window.confirm('Reset the workspace to its seeded demo state? Everything created in this browser is discarded.')) { resetWS(); nav('/ai'); } }}><I n="refresh" s={12} /> Reset demo data</button>
        <NavLink to="/ai/settings" className={({ isActive }) => 'fs-footbtn' + (isActive ? ' on' : '')} onClick={onClose}><I n="sliders" s={12} /> Settings</NavLink>
        <button className="fs-footbtn" onClick={() => { logout(); nav('/ai'); }}><I n="logout" s={12} /> Log out</button>
      </div>
    </aside>
  );
}
