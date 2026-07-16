// Playbooks — six curated PM workflows that turn what the project already
// knows into a finished chain document. Hybrid engine, same philosophy as
// chat: a deterministic template engine that always works (demo-safe,
// instant), upgraded in place by the local model when one is connected —
// the LLM writes the prose, but the template controls the structure and the
// deterministic result is the fallback for any failure. Outputs land as real
// chain documents (write-spec → a draft BRD; everything else → a research
// note), so traceability starts the moment a playbook runs.
import { ollamaChat } from '../lib/ollama';
import { uid, now, usingLocal, stageInfo, staleCount, staleInfo, STAGES, STAGE_HINT, TYPES } from './workspace';

// ---- shared helpers ----
const firstSentence = (t) => (t || '').replace(/\s+/g, ' ').split(/(?<=[.!?])\s/)[0]?.trim() || '';
const bullet = (items) => items.map((x) => `- ${x}`).join('\n');
const today = () => new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// Source research only — playbook outputs land as research notes too, and
// feeding them back into the next playbook would compound noise.
const sourceResearch = (p) => p.research.filter((r) => r.source !== 'playbook');

// Lines from research that read like requirements or decisions.
function requirementLines(project) {
  const out = [];
  for (const r of sourceResearch(project)) {
    for (const line of (r.content || '').split('\n')) {
      const t = line.replace(/^[-*\d.\s]+/, '').trim();
      if (t.length > 20 && /\b(must|should|shall|needs?|requires?|add|verify|define|support|enable)\b/i.test(t)) out.push(t);
    }
  }
  return out.slice(0, 6);
}
const unscheduledStories = (project) => {
  const scheduled = new Set(project.releases.flatMap((r) => r.storyIds));
  return project.stories.filter((s) => !scheduled.has(s.id));
};

// ---- the six playbooks ----
// Each: gather() picks the context the engine grounds on; build() is the
// deterministic template fill returning { title, content } (markdown), plus
// for write-spec the structured `sections` a BRD needs.
export const PLAYBOOKS = [
  {
    id: 'write-spec', label: 'Write a spec', icon: 'clipboard', stage: 'define', out: 'Draft BRD',
    desc: 'Turns your research notes into a structured draft BRD, ready to edit and lock.',
    ready: (p) => (p.research.length ? null : 'Add at least one research note first — a spec starts from evidence.'),
    gather: (p) => sourceResearch(p).map((r) => ({ title: r.title, text: r.content })),
    build: (p) => {
      const background = sourceResearch(p).map((r) => firstSentence(r.content)).filter(Boolean).join(' ');
      const requirements = requirementLines(p);
      const sections = {
        background: background || `Draft background for ${p.name} — summarize the business problem the research surfaced.`,
        requirements: requirements.length ? requirements : ['Refine this requirement from your research'],
        stakeholders: '', success: ''
      };
      return { title: `Spec — ${p.name}`, sections, content: `# Spec — ${p.name}\n\n## Background\n${sections.background}\n\n## Requirements\n${bullet(sections.requirements)}` };
    }
  },
  {
    id: 'synthesize-research', label: 'Synthesize research', icon: 'book', stage: 'discover', out: 'Research note',
    desc: 'Merges every research note and conversation into themes and open questions.',
    ready: (p) => (p.research.length + p.conversations.length ? null : 'Nothing to synthesize yet — add research or have a conversation.'),
    gather: (p) => [
      ...sourceResearch(p).map((r) => ({ title: r.title, text: r.content })),
      ...p.conversations.map((c) => ({ title: c.title, text: c.messages.map((m) => `${m.role}: ${m.content}`).join('\n') }))
    ],
    build: (p) => ({
      title: `Research synthesis — ${today()}`,
      content: `## Sources reviewed\n${bullet([...sourceResearch(p).map((r) => r.title), ...p.conversations.map((c) => `Conversation: ${c.title}`)])}\n\n## Key themes\n${bullet(sourceResearch(p).map((r) => firstSentence(r.content)).filter(Boolean))}\n\n## Open questions\n- Which theme carries the strongest evidence for a BRD?\n- What has NOT been validated with users or data yet?`
    })
  },
  {
    id: 'competitive-brief', label: 'Competitive brief', icon: 'target', stage: 'discover', out: 'Research note',
    desc: 'Summarizes competitive position, market signals in your research, and gaps.',
    ready: (p) => (p.research.length ? null : 'Add research first — a brief without evidence is a guess.'),
    gather: (p) => sourceResearch(p).map((r) => ({ title: r.title, text: r.content })),
    build: (p) => {
      const signals = sourceResearch(p).flatMap((r) => (r.content || '').split('\n').filter((l) => /compet|market|rival|player|alternative/i.test(l)).map((l) => l.trim())).slice(0, 5);
      return {
        title: `Competitive brief — ${p.name}`,
        content: `## Where we stand\n${p.about || 'Describe the product position this project defends or advances.'}\n\n## Signals from research\n${signals.length ? bullet(signals) : '- No explicit competitor mentions in research yet — worth a dedicated scan.'}\n\n## Gaps to close\n${bullet(requirementLines(p).slice(0, 3)) || '- Derive gaps from the requirements once research lands.'}\n\n## Suggested next checks\n- Pricing and packaging of the two closest alternatives\n- One switching-user interview: why did they leave, what almost kept them`
      };
    }
  },
  {
    id: 'stakeholder-update', label: 'Stakeholder update', icon: 'send', stage: 'build', out: 'Research note',
    desc: 'Status update built from the live project: stage, progress, releases, risks.',
    ready: () => null,
    gather: (p) => [{ title: 'Project state', text: `${p.name}: ${p.about}` }],
    build: (p) => {
      const { current } = stageInfo(p);
      const stale = staleCount(p);
      const counts = ['research', 'brd', 'story', 'test'].map((t) => `${(p[TYPES[t].key] || []).length} ${TYPES[t].label.toLowerCase()}`).join(' · ');
      const rel = p.releases[0];
      return {
        title: `Stakeholder update — ${today()}`,
        content: `## Where we are\n${p.name} is in **${STAGES.find((s) => s.id === current).label}**. ${STAGE_HINT[current]}\n\n## Progress\n${counts}\n\n## Releases\n${rel ? `- ${rel.name} — ${rel.date} (${rel.storyIds.length} stories)` : '- No release planned yet.'}\n\n## Risks\n${stale ? `- ${stale} downstream artifact(s) are stale — upstream BRD moved; regenerate before build starts.` : '- No staleness detected — the chain is consistent.'}\n${p.brds.filter((b) => !b.versions.length).length ? '- Draft BRD(s) not yet locked — definition can still drift.' : ''}\n\n## Next\n${STAGE_HINT[current]}`
      };
    }
  },
  {
    id: 'sprint-planning', label: 'Sprint planning', icon: 'layers', stage: 'build', out: 'Research note',
    desc: 'Groups unscheduled stories into point-balanced sprints and flags risks.',
    ready: (p) => (p.stories.length ? null : 'No user stories yet — generate the delivery chain from a BRD first.'),
    gather: (p) => unscheduledStories(p).map((s) => ({ title: s.title, text: `${s.points || '?'} pts — ${s.description}` })),
    build: (p) => {
      const todo = unscheduledStories(p);
      if (!todo.length) return { title: `Sprint plan — ${today()}`, content: '## All stories scheduled\nEvery story is already bundled into a release. Plan the next slice from the BRD.' };
      const VELOCITY = 12;
      const sprints = [[]];
      let load = 0;
      for (const s of [...todo].sort((a, b) => (b.points || 0) - (a.points || 0))) {
        if (load + (s.points || 0) > VELOCITY && sprints[sprints.length - 1].length) { sprints.push([]); load = 0; }
        sprints[sprints.length - 1].push(s); load += s.points || 0;
      }
      const staleFlags = todo.filter((s) => staleInfo(p, 'story', s));
      const risks = staleFlags.length
        ? bullet(staleFlags.map((s) => `"${s.title}" traces to a stale PDN — regenerate before committing.`))
        : `- None from traceability; confirm capacity assumptions (velocity ${VELOCITY} pts) with the team.`;
      return {
        title: `Sprint plan — ${today()}`,
        content: sprints.map((sp, i) => `## Sprint ${i + 1} — ${sp.reduce((a, s) => a + (s.points || 0), 0)} pts\n${bullet(sp.map((s) => `${s.title} (${s.points || '?'} pts)`))}`).join('\n\n') + `\n\n## Risks\n${risks}`
      };
    }
  },
  {
    id: 'metrics-review', label: 'Metrics review', icon: 'checks', stage: 'measure', out: 'Research note',
    desc: 'Lines up the success criteria you wrote against what actually shipped.',
    ready: (p) => (p.releases.length ? null : 'Ship a release first — measurement needs something live.'),
    gather: (p) => p.brds.map((b) => ({ title: b.title, text: `Success criteria: ${b.sections.success || 'none recorded'}` })),
    build: (p) => {
      const criteria = p.brds.map((b) => ({ t: b.title, s: b.sections.success })).filter((x) => x.s);
      const shipped = p.releases.filter((r) => r.date && r.date <= new Date().toISOString().slice(0, 10));
      return {
        title: `Metrics review — ${today()}`,
        content: `## Success criteria on record\n${criteria.length ? bullet(criteria.map((c) => `${c.t}: ${c.s}`)) : '- No BRD carries success criteria — that is the first gap to fix.'}\n\n## Shipped\n${shipped.length ? bullet(shipped.map((r) => `${r.name} — ${r.date}`)) : '- Nothing live yet; releases are planned but not past their date.'}\n\n## Review\n${bullet(criteria.map((c) => `Is "${c.s}" instrumented and on a dashboard? If not, add tracking before claiming the outcome.`)) || '- Define one metric per shipped release and a baseline to compare against.'}`
      };
    }
  }
];

export const findPlaybook = (id) => PLAYBOOKS.find((pb) => pb.id === id) || null;

// ---- hybrid engine ----
// Deterministic build first (it is also the shape the output lands in), then
// let a connected local model rewrite the prose grounded in the gathered
// context. Any local failure — server down, bad output — falls back to the
// deterministic result, so a playbook can never error on stage.
const SYSTEM = `You are Feasly's PM writing assistant. Rewrite the draft document using ONLY facts from the provided context. Keep EXACTLY the same markdown headings and overall structure as the draft. Improve the prose: specific, concise, no hype, no invented facts or numbers. Return only the markdown document.`;

export async function runPlaybook({ playbook, project, ws }) {
  const det = playbook.build(project);
  const footer = (engine) => `\n\n---\n_${playbook.label} playbook · ${engine} · ${today()}_`;
  if (usingLocal(ws)) {
    try {
      const context = playbook.gather(project).map((c, i) => `[${i + 1}] ${c.title}\n${(c.text || '').slice(0, 1200)}`).join('\n---\n');
      const reply = await ollamaChat({
        endpoint: ws.local.endpoint, model: ws.local.chatModel, temperature: ws.local.temperature ?? 0.1,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Context:\n---\n${context}\n---\n\nDraft document:\n${det.content}` }
        ]
      });
      // Small local models love wrapping markdown in a code fence — unwrap.
      const cleaned = (reply || '').trim().replace(/^```(?:markdown)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      // A usable rewrite keeps the structure; anything degenerate falls back.
      if (cleaned.includes('#') && cleaned.length > det.content.length / 2) {
        return { ...det, content: cleaned + footer('local model'), engine: 'local' };
      }
    } catch { /* local unavailable — deterministic result stands */ }
  }
  return { ...det, content: det.content + footer('deterministic engine'), engine: 'deterministic' };
}

// ---- landing: playbook output becomes a real chain document ----
// Returns the route (relative to /ai/p/:pid/) of the created document.
export function landOutput(w, pid, playbook, result) {
  const projects = w.projects.map((p) => {
    if (p.id !== pid) return p;
    if (playbook.id === 'write-spec') {
      const brd = {
        id: uid(), title: result.title, owner: 'PM', status: 'Draft',
        researchIds: sourceResearch(p).map((r) => r.id), sections: result.sections,
        createdAt: now(), versions: []
      };
      result._route = `brds/${brd.id}`;
      return { ...p, brds: [...p.brds, brd] };
    }
    const note = { id: uid(), title: result.title, source: 'playbook', sourceDetail: playbook.label, createdAt: now(), content: result.content };
    result._route = `research/${note.id}`;
    return { ...p, research: [...p.research, note] };
  });
  return { ...w, projects };
}
