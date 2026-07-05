// Feasly workspace store — localStorage-backed, demo-grade persistence for
// chats, projects, research books, planner items, model connections and
// versioned artifacts. Every page reads through loadWS/saveWS so state
// survives reloads and the journey handoff.

const KEY = 'feasly-workspace-v1';

const EMPTY = {
  chats: [],        // { id, title, kind: 'chat'|'research', projectId, bookId, messages, createdAt, updatedAt }
  projects: [],     // { id, name, about, files: [{name,size,addedAt}], createdAt }
  books: [],        // { id, title, projectId, createdAt }
  tasks: [],        // { id, title, due, remind, done, createdAt }
  events: [],       // { id, title, date: 'yyyy-mm-dd', time, kind: 'call'|'meeting'|'reminder' }
  models: [],       // { id, name, provider: 'local'|'anthropic'|'openai', endpoint, keyMasked }
  connectors: { outlook: false, gmail: false },
  activeModelId: null,
  artifacts: []     // { id, title, reqs, versions: [{v,ts,note,stories,pdn,tests}] }
};

export function loadWS() {
  try { return { ...EMPTY, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; }
  catch { return { ...EMPTY }; }
}
export function saveWS(next) {
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}
export const uid = () => Math.random().toString(36).slice(2, 9);
export const now = () => new Date().toISOString();

export function activeModelLabel(ws) {
  const m = (ws.models || []).find((x) => x.id === ws.activeModelId);
  return m ? m.name : 'Feasly demo brain (offline)';
}

// ---- artifact markdown builders (from an /analyze result) ----
export function storiesToMd(r) {
  return (r.stories || []).map((s, i) =>
    `## Story ${i + 1} — ${s.summary}\n\n` +
    `**Component:** ${s.component} · **Points:** ${s.points}\n\n${s.description}\n\n` +
    `**Tasks**\n${s.tasks.map((t) => `- ${t}`).join('\n')}\n\n` +
    `**Acceptance criteria**\n${s.ac.map((a) => `- ${a}`).join('\n')}\n`
  ).join('\n');
}
export function testsToMd(r) {
  return (r.test_suites || []).map((suite) =>
    `## ${suite.story}\n\n` +
    suite.cases.map((c) => `### ${c.id} — ${c.title}\n\n\`\`\`gherkin\n${c.gherkin}\n\`\`\`\n`).join('\n')
  ).join('\n');
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ---- date helpers for the planner calendar ----
export const ymd = (d) => d.toISOString().slice(0, 10);
export function monthMatrix(year, month) {
  // Weeks start Monday. Returns array of weeks, each an array of Date|null.
  const first = new Date(Date.UTC(year, month, 1));
  const startDow = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = [...Array(startDow).fill(null), ...Array.from({ length: days }, (_, i) => new Date(Date.UTC(year, month, i + 1)))];
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
