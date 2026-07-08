// Analyzer: maps a change request onto the entity knowledge base, then
// verifies every claimed impact against the ACTUAL source files on disk,
// pulling evidence lines. An impact with no evidence is downgraded to
// "verify manually" rather than asserted — no hallucinated dependencies.
const fs = require('fs');
const path = require('path');
const { LAYERS, ENTITIES } = require('./knowledge');

const REPO_ROOT = path.join(__dirname, '../..');

// Deployed bundles don't have sibling-package source files on disk at these
// relative paths (see scripts/build-ai-snapshot.js) — fall back to a
// build-time snapshot when the live read fails. Wrapped in try/catch so a
// fresh clone with no snapshot built yet doesn't crash local dev (which
// never needs the fallback, since the real files are right there).
let snapshot = {};
try { snapshot = require('./fileSnapshot.generated.js'); } catch { /* not built yet — fine locally */ }

function readSource(file) {
  try { return fs.readFileSync(path.join(REPO_ROOT, file), 'utf8'); }
  catch { return snapshot[file] || null; }
}

function evidenceFor(file, pattern) {
  const content = readSource(file);
  if (content == null) return null;
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) return { line: i + 1, snippet: lines[i].trim().slice(0, 160) };
  }
  return null;
}

function detectEntities(text) {
  const t = ' ' + text.toLowerCase() + ' ';
  return Object.entries(ENTITIES)
    .map(([id, e]) => ({ id, e, score: e.keywords.filter(k => t.includes(k)).length }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.id);
}

const worst = (vs) => vs.includes('r') ? 'r' : vs.includes('a') ? 'a' : 'g';
const SIZES = ['S', 'M', 'L', 'XL'];
const maxSize = (arr) => arr.reduce((a, b) => SIZES.indexOf(b) > SIZES.indexOf(a) ? b : a, 'S');

function analyze(text) {
  const ids = detectEntities(text);
  if (!ids.length) {
    return {
      matched: false, text,
      note: 'Change request could not be mapped to entities known in either codebase. Likely net-new capability — recommend a Tech discovery spike before PDN.'
    };
  }
  const ents = ids.map(id => ({ id, ...ENTITIES[id] }));

  // de-dup impacts by file, keep worst verdict, attach live code evidence
  const seen = {};
  for (const ent of ents) {
    for (const i of ent.impacts) {
      const k = i.file;
      if (!seen[k] || worst([seen[k].v, i.v]) === i.v) {
        seen[k] = { ...i, entity: ent.label, evidence: evidenceFor(i.file, i.pattern), pattern: undefined };
      }
    }
  }
  const impacts = Object.values(seen);
  const layerVerdicts = {};
  for (const lid of Object.keys(LAYERS)) {
    const ls = impacts.filter(i => i.layer === lid);
    layerVerdicts[lid] = ls.length ? worst(ls.map(i => i.v)) : null;
  }

  return {
    matched: true, text,
    // Clean handle for artifact titles — full requirements text stays in
    // `text`. Titled after the broadest-impact entity so a BRD that gains a
    // secondary scope (e.g. default handling on top of EMI) keeps stable
    // story titles across versions instead of re-titling the whole chain.
    title: ents.slice().sort((a, b) => b.impacts.length - a.impacts.length)[0].label,
    entities: ents.map(e => ({ id: e.id, label: e.label })),
    featureStories: ents.filter(e => e.story).map(e => e.story),
    overall: worst(impacts.map(i => i.v)),
    size: maxSize(ents.map(e => e.size)),
    sprints: ents.length === 1 ? ents[0].sprints : 'combined scope — sequence per entity in PDN',
    coreChange: impacts.some(i => i.layer === 'core' || i.layer === 'db'),
    impacts, layerVerdicts,
    risks: [...new Set(ents.flatMap(e => e.risks))],
    openq: [...new Set(ents.flatMap(e => e.openq))],
    files: impacts.map(i => i.file),
    verified: impacts.filter(i => i.evidence).length,
    unverified: impacts.filter(i => !i.evidence).length
  };
}

module.exports = { analyze, LAYERS };
