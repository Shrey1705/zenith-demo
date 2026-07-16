#!/usr/bin/env node
// Customer Simulation Engine — evaluate the current build through the eyes
// of weighted customer personas, roleplayed entirely by the local model
// (zero cloud tokens). Each persona runs N times (default 3); per-category
// MEDIANS are scored and run-to-run VARIANCE is reported, because an LLM
// judge is noisy — a score move smaller than the variance is not signal.
//
//   node sim/run.js                          # all personas, 3 runs each
//   node sim/run.js --personas startup-pm    # subset
//   node sim/run.js --runs 1                 # quick smoke pass
//
// Output: sim/reports/build-<git-sha>.md (+ .json for interview-prep.js)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { chatJSON, pickServer } = require('../tools/qwen');
const { CATEGORIES, CATEGORY_KEYS, validatePersona } = require('./rubric');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const argOf = (flag, dflt) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : dflt; };
const RUNS = parseInt(argOf('--runs', '3'), 10);
const ONLY = argOf('--personas', '').split(',').filter(Boolean);

function loadPersonas() {
  const dir = path.join(__dirname, 'personas');
  const all = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  for (const p of all) {
    const errs = validatePersona(p);
    if (errs.length) throw new Error(`Persona ${p.id || '?'}: ${errs.join('; ')}`);
  }
  return ONLY.length ? all.filter((p) => ONLY.includes(p.id)) : all;
}

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

function flowsTranscript(flows) {
  return flows.flows.map((f) =>
    `### Flow: ${f.name}\n` + f.steps.map((s) => `[${s.screen}] ${s.text}${s.actions.length ? ` (available actions: ${s.actions.join(', ')})` : ''}`).join('\n')
  ).join('\n\n');
}

const SYSTEM = `You are roleplaying a specific customer persona trying a product for the first time. Stay strictly in character. Be realistic and critical the way real buyers are — polite scores help nobody. Ground every observation in the walkthrough transcript; do not invent screens or features that are not shown. Return ONLY a JSON object, no prose around it.`;

function personaPrompt(persona, transcript) {
  const rubric = CATEGORY_KEYS.map((k) => `- ${k}: ${CATEGORIES[k]}`).join('\n');
  return `YOUR PERSONA:\n${JSON.stringify(persona, null, 1)}\n
THE PRODUCT WALKTHROUGH (everything you saw, in order):\n${transcript}\n
Score each category 1-5 using these anchors:\n${rubric}\n
Return exactly this JSON shape:
{
 "scores": {${CATEGORY_KEYS.map((k) => `"${k}": <1-5>`).join(', ')}},
 "painPoints": ["specific frustrations you hit, worst first"],
 "bugs": ["anything that looked broken or wrong — empty array if none"],
 "featureRequests": ["what you needed that was missing"],
 "quotes": ["1-2 first-person reactions in your own voice"],
 "wouldPay": <true|false — from YOUR stated budget, today, as-is>,
 "wouldRecommend": <true|false>,
 "verdict": "one blunt sentence in character"
}`;
}

function validResult(r) {
  if (!r || typeof r !== 'object' || !r.scores) return false;
  return CATEGORY_KEYS.every((k) => Number.isFinite(r.scores[k]) && r.scores[k] >= 1 && r.scores[k] <= 5);
}

async function evaluatePersona(persona, transcript) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    process.stdout.write(`  ${persona.id} run ${i + 1}/${RUNS}… `);
    const t0 = Date.now();
    let result = null;
    for (let attempt = 0; attempt < 2 && !result; attempt++) {
      const r = await chatJSON([
        { role: 'system', content: SYSTEM },
        { role: 'user', content: personaPrompt(persona, transcript) }
      ], { temperature: 0.35, maxTokens: 1400 });
      if (validResult(r)) result = r;
    }
    if (!result) throw new Error(`${persona.id}: model returned invalid scores twice`);
    runs.push(result);
    console.log(`${Math.round((Date.now() - t0) / 1000)}s`);
  }

  const scores = {}, variance = {};
  for (const k of CATEGORY_KEYS) {
    const xs = runs.map((r) => r.scores[k]);
    scores[k] = median(xs);
    variance[k] = Math.max(...xs) - Math.min(...xs);
  }
  const weighted = CATEGORY_KEYS.reduce((a, k) => a + scores[k] * persona.weights[k], 0);
  const dedupe = (key) => [...new Set(runs.flatMap((r) => r[key] || []))];
  const majority = (key) => runs.filter((r) => r[key]).length > runs.length / 2;
  return {
    id: persona.id, name: persona.name,
    weightedScore: Math.round(weighted * 100) / 100,
    scores, variance, maxVariance: Math.max(...Object.values(variance)),
    painPoints: dedupe('painPoints'), bugs: dedupe('bugs'),
    featureRequests: dedupe('featureRequests'), quotes: dedupe('quotes'),
    wouldPay: majority('wouldPay'), wouldRecommend: majority('wouldRecommend'),
    verdicts: runs.map((r) => r.verdict).filter(Boolean)
  };
}

function aggregate(results) {
  const overall = results.reduce((a, r) => a + r.weightedScore, 0) / results.length;
  // A blocker is a category at least 3 personas scored ≤ 2 — systemic, not taste.
  const blockers = CATEGORY_KEYS
    .map((k) => ({ category: k, flaggedBy: results.filter((r) => r.scores[k] <= 2).map((r) => r.id) }))
    .filter((b) => b.flaggedBy.length >= Math.min(3, results.length));
  const bugs = results.flatMap((r) => r.bugs.map((b) => `${b} (${r.id})`));
  const noisy = results.filter((r) => r.maxVariance >= 2).map((r) => r.id);
  const payers = results.filter((r) => r.wouldPay).map((r) => r.id);
  const recommendation =
    overall < 3 || blockers.length >= 2 ? 'NOT-READY'
    : overall < 4 || blockers.length || bugs.length ? 'FIX-FIRST'
    : 'SHIP';
  const confidence = noisy.length === 0 ? 'high' : noisy.length <= 2 ? 'medium' : 'low';
  return { overall: Math.round(overall * 100) / 100, blockers, bugs, payers, noisy, recommendation, confidence };
}

function renderMd(sha, model, agg, results) {
  const lines = [];
  lines.push(`# Build report — ${sha}`, '');
  lines.push(`_Evaluated ${new Date().toISOString().slice(0, 10)} · ${results.length} personas × ${RUNS} runs · judge: ${model} (local)_`, '');
  lines.push(`## Overall Product Score: ${agg.overall} / 5 — **${agg.recommendation}** (confidence: ${agg.confidence})`, '');
  lines.push(`Would pay today: ${agg.payers.length ? agg.payers.join(', ') : 'nobody'} (${agg.payers.length}/${results.length})`, '');
  if (agg.blockers.length) {
    lines.push('## Critical blockers');
    for (const b of agg.blockers) lines.push(`- **${b.category}** scored ≤2 by: ${b.flaggedBy.join(', ')}`);
    lines.push('');
  }
  if (agg.bugs.length) lines.push('## Bugs reported', ...agg.bugs.map((b) => `- ${b}`), '');
  if (agg.noisy.length) lines.push(`> Noisy judges (variance ≥2 in some category — treat their scores with care): ${agg.noisy.join(', ')}`, '');
  lines.push('## Persona breakdown', '');
  lines.push(`| Persona | Weighted | Pay? | Recommend? | Lowest categories |`);
  lines.push(`|---|---|---|---|---|`);
  for (const r of [...results].sort((a, b) => b.weightedScore - a.weightedScore)) {
    const lowest = CATEGORY_KEYS.map((k) => [k, r.scores[k]]).sort((a, b) => a[1] - b[1]).slice(0, 2).map(([k, v]) => `${k} ${v}`).join(', ');
    lines.push(`| ${r.name} | ${r.weightedScore} | ${r.wouldPay ? '✅' : '❌'} | ${r.wouldRecommend ? '✅' : '❌'} | ${lowest} |`);
  }
  lines.push('');
  for (const r of results) {
    lines.push(`### ${r.name} — ${r.weightedScore}/5`);
    if (r.quotes.length) lines.push(`> ${r.quotes[0]}`);
    if (r.painPoints.length) lines.push('', '**Pain points:**', ...r.painPoints.slice(0, 5).map((x) => `- ${x}`));
    if (r.featureRequests.length) lines.push('', '**Feature requests:**', ...r.featureRequests.slice(0, 5).map((x) => `- ${x}`));
    lines.push('');
  }
  lines.push('---', '_Suggested improvements = intersection of pain points across personas; run `npm run sim:interview` to turn this report into real-user interview guides._');
  return lines.join('\n');
}

async function main() {
  const flows = JSON.parse(fs.readFileSync(path.join(__dirname, 'captures/flows.json'), 'utf8'));
  const personas = loadPersonas();
  const transcript = flowsTranscript(flows);
  const { base, model } = await pickServer();
  let sha = 'local';
  try { sha = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch { /* not fatal */ }
  console.log(`Sim engine — ${personas.length} persona(s) × ${RUNS} run(s) · judge: ${model} @ ${base}\n`);

  const results = [];
  for (const p of personas) results.push(await evaluatePersona(p, transcript));
  const agg = aggregate(results);

  const outDir = path.join(__dirname, 'reports');
  fs.mkdirSync(outDir, { recursive: true });
  const md = renderMd(sha, model, agg, results);
  fs.writeFileSync(path.join(outDir, `build-${sha}.md`), md);
  fs.writeFileSync(path.join(outDir, `build-${sha}.json`), JSON.stringify({ sha, model, runs: RUNS, date: new Date().toISOString(), aggregate: agg, results }, null, 2));
  console.log(`\nOverall: ${agg.overall}/5 → ${agg.recommendation} (confidence ${agg.confidence})`);
  console.log(`Report: sim/reports/build-${sha}.md`);
}

main().catch((e) => { console.error('SIM FAILED:', e.message); process.exit(1); });
