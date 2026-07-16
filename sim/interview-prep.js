#!/usr/bin/env node
// Interview prep — the sim engine's real purpose: a rehearsal for market
// testing, not a substitute. Takes the latest build report and turns every
// simulated pain point and weak category into things to verify with real
// humans: questions to ask, hypotheses to test, and a scoring sheet to fill
// during the call. Runs on the local model; falls back to a deterministic
// guide if no model server is up.
//
//   node sim/interview-prep.js            # uses newest sim/reports/*.json
const fs = require('fs');
const path = require('path');
const { chat } = require('../tools/qwen');
const { CATEGORY_KEYS } = require('./rubric');

function latestReport() {
  const dir = path.join(__dirname, 'reports');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  if (!files.length) throw new Error('No sim reports yet — run `node sim/run.js` first.');
  return JSON.parse(fs.readFileSync(path.join(dir, files[files.length - 1]), 'utf8'));
}

// Deterministic core: weak categories + pain points → question templates.
function deterministicGuide(report) {
  const lines = [`# Interview guide — from build ${report.sha}`, '',
    `_Generated ${new Date().toISOString().slice(0, 10)}. These are HYPOTHESES from simulated personas — the point of the interview is to find out where the simulation was wrong._`, ''];

  for (const r of report.results) {
    const weak = CATEGORY_KEYS.map((k) => [k, r.scores[k]]).filter(([, v]) => v <= 3).sort((a, b) => a[1] - b[1]);
    lines.push(`## When talking to someone like: ${r.name}`, '');
    lines.push(`**Simulated verdict:** ${r.verdicts[0] || '—'}`, '');
    lines.push('**Hypotheses to test (from simulated pain points):**');
    for (const p of r.painPoints.slice(0, 4)) lines.push(`- H: "${p}" — Ask: "Walk me through the last time this happened in your real work. What did you do instead?"`);
    if (weak.length) {
      lines.push('', '**Weak-category probes:**');
      for (const [k, v] of weak.slice(0, 3)) lines.push(`- ${k} scored ${v}/5 in simulation — ask them to perform that part live and narrate; note where they hesitate.`);
    }
    if (r.featureRequests.length) {
      lines.push('', '**Requested features — validate before building:**');
      for (const f of r.featureRequests.slice(0, 3)) lines.push(`- "${f}" — Ask: "If this existed, what would you stop using?" (no current tool named = not a real need)`);
    }
    lines.push('', `**Money question:** their simulated answer was wouldPay=${r.wouldPay}. Ask the real one: "If this disappeared next month, what would you miss? Would you pay ₹1,500/month to keep it?"`, '');
  }

  lines.push('## Scoring sheet (fill during each call)', '');
  lines.push('| Category | Their reaction (1-5) | Their words |', '|---|---|---|');
  for (const k of CATEGORY_KEYS) lines.push(`| ${k} |  |  |`);
  lines.push('', '**After the call:** compare against the simulated scores in the build report — every big gap is a persona to fix or an insight to keep.');
  return lines.join('\n');
}

async function main() {
  const report = latestReport();
  let guide = deterministicGuide(report);
  // Let the local model sharpen the phrasing; deterministic guide stands on failure.
  try {
    const polished = await chat([
      { role: 'system', content: 'You are a user-research coach. Improve the interview guide: sharper, non-leading questions a PM can read verbatim on a call. Keep EXACTLY the same markdown structure and headings. No invented facts. Return only the document.' },
      { role: 'user', content: guide }
    ], { temperature: 0.3, maxTokens: 2500 });
    const cleaned = polished.trim().replace(/^```(?:markdown)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    if (cleaned.includes('#') && cleaned.length > guide.length / 2) guide = cleaned + '\n\n_(polished by local model)_';
  } catch { /* no model server — deterministic guide ships as-is */ }

  const out = path.join(__dirname, 'reports', `interview-guide-${report.sha}.md`);
  fs.writeFileSync(out, guide);
  console.log(`Interview guide: sim/reports/interview-guide-${report.sha}.md`);
}

main().catch((e) => { console.error('INTERVIEW-PREP FAILED:', e.message); process.exit(1); });
