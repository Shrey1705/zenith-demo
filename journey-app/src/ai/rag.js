// Client-side RAG over the workspace + the connected codebase, powered by a
// locally hosted model (Ollama). Documents and code files are chunked,
// embedded into vectors, and stored locally; questions retrieve the nearest
// chunks by cosine similarity and the local model answers ONLY from that
// context at low temperature — cite or say "cannot verify", never guess.
import { ai } from '../lib/api';
import { ollamaEmbed, ollamaChat } from '../lib/ollama';
import { TYPES } from './workspace';

const INDEX_KEY = 'feasly-vectors-v1';

export function loadIndex() {
  try { return JSON.parse(localStorage.getItem(INDEX_KEY)) || null; } catch { return null; }
}
function saveIndex(idx) {
  try { localStorage.setItem(INDEX_KEY, JSON.stringify(idx)); } catch { /* quota — index stays in memory */ }
}
export function clearIndex() { try { localStorage.removeItem(INDEX_KEY); } catch { /* ignore */ } }

// ---- corpus: every workspace document + the indexed source files ----
export async function collectCorpus(project, token) {
  const chunks = [];
  const push = (type, refId, title, text) => {
    const t = (text || '').trim();
    if (t.length < 40) return;
    chunks.push({ key: `${type}:${refId}`, projectId: project.id, type, refId, title, text: t.slice(0, 1400) });
  };
  for (const r of project.research) push('research', r.id, r.title, r.content);
  for (const b of project.brds) {
    const s = b.sections;
    push('brd', b.id, b.title, `Background: ${s.background}\nRequirements: ${s.requirements.join('; ')}\nStakeholders: ${s.stakeholders}\nSuccess: ${s.success}`);
  }
  for (const p of project.pdns) push('pdn', p.id, p.title, p.content);
  for (const st of project.stories) push('story', st.id, st.title, `${st.description}\nAcceptance criteria: ${(st.ac || []).join('; ')}`);
  for (const f of project.frs) push('fr', f.id, f.title, f.description);
  for (const t of project.tests) push('test', t.id, t.title, t.gherkin);
  // The actual code files the deterministic analyzer grounds on.
  try {
    const r = await ai.sources(token);
    for (const f of r.files || []) {
      // Split large files into ~1200-char chunks so retrieval stays precise.
      const parts = f.content.match(/[\s\S]{1,1200}/g) || [];
      parts.forEach((part, i) => {
        chunks.push({ key: `code:${f.file}#${i}`, projectId: project.id, type: 'code', refId: f.file, title: `${f.file.split('/').slice(-2).join('/')}${parts.length > 1 ? ` (part ${i + 1})` : ''}`, text: part });
      });
    }
  } catch { /* sources endpoint unavailable — index documents only */ }
  return chunks;
}

// ---- index build (batched embedding with progress callback) ----
export async function buildIndex({ project, token, local, onProgress }) {
  const chunks = await collectCorpus(project, token);
  const items = [];
  const BATCH = 8;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const vectors = await ollamaEmbed({ endpoint: local.endpoint, model: local.embedModel, input: batch.map((c) => `${c.title}\n${c.text}`) });
    batch.forEach((c, j) => items.push({ ...c, vector: vectors[j] }));
    onProgress?.(Math.min(i + BATCH, chunks.length), chunks.length);
  }
  const idx = { model: local.embedModel, dims: items[0]?.vector?.length || 0, builtAt: new Date().toISOString(), projectId: project.id, items };
  saveIndex(idx);
  return idx;
}

// ---- retrieval ----
export function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export async function retrieve({ query, local, k = 5 }) {
  const idx = loadIndex();
  if (!idx || !idx.items.length) return null;
  const [qv] = await ollamaEmbed({ endpoint: local.endpoint, model: idx.model, input: [query] });
  return idx.items
    .map((it) => ({ ...it, score: cosine(qv, it.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

// ---- grounded ask: retrieve → low-temperature local generation ----
const SYSTEM = `You are Feasly's analyst for the Zenith Health insurance tenant. Answer ONLY from the provided context chunks — they contain the tenant's research documents and actual source code. Rules:
1. Cite every claim with its source in parentheses, e.g. (source: premium.rules.yaml) or (source: Churn interviews).
2. If the context does not contain the answer, say plainly what could not be verified — never guess or invent.
3. Be concise: short paragraphs or bullets, no preamble.`;

export async function askLocal({ question, project, token, local, ensureIndex = true, onProgress }) {
  let idx = loadIndex();
  if ((!idx || idx.projectId !== project.id || !idx.items.length) && ensureIndex) {
    idx = await buildIndex({ project, token, local, onProgress });
  }
  const hits = await retrieve({ query: question, local, k: 5 });
  const context = (hits || []).map((h, i) => `[${i + 1}] ${h.title}\n${h.text}`).join('\n---\n');
  const reply = await ollamaChat({
    endpoint: local.endpoint,
    model: local.chatModel,
    temperature: local.temperature ?? 0.1,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `Context:\n---\n${context}\n---\n\nQuestion: ${question}` }
    ]
  });
  return {
    reply,
    engine: 'local',
    sources: (hits || []).map((h) => ({ type: h.type, refId: h.refId, title: h.title, score: Math.round(h.score * 100) / 100 }))
  };
}

export const TYPE_ICON = (t) => (t === 'code' ? '🧬' : TYPES[t]?.icon || '📄');
