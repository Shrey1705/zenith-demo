// Server-side stakeholder-update playbook — a CJS port of the deterministic
// builder in journey-app/src/ai/playbooks.js plus the minimal workspace
// helpers it grounds on (journey-app/src/ai/workspace.js). Exists so n8n can
// fetch a finished status update on a schedule without a browser in the loop;
// if the client-side builder changes, keep this port in step.

const STAGES = [
  { id: 'discover', label: 'Discover' },
  { id: 'define', label: 'Define' },
  { id: 'build', label: 'Build' },
  { id: 'launch', label: 'Launch' },
  { id: 'measure', label: 'Measure' }
];
const STAGE_HINT = {
  discover: 'Add research or ask the AI — understanding comes before specifying.',
  define: 'Write the BRD and save v1 to lock the definition.',
  build: 'Generate the PDN, then the delivery chain, from the BRD.',
  launch: 'Bundle the stories into a dated release.',
  measure: 'Track the release, then review outcomes and adoption once it ships.'
};
const TYPE_META = {
  research: { key: 'research', label: 'Research' },
  brd: { key: 'brds', label: 'BRDs' },
  story: { key: 'stories', label: 'User Stories' },
  test: { key: 'tests', label: 'Test Cases' }
};

function stageInfo(project) {
  const today = new Date().toISOString().slice(0, 10);
  const done = {
    discover: ((project.research || []).length + (project.conversations || []).length) > 0,
    define: (project.brds || []).some((b) => (b.versions || []).length > 0),
    build: (project.stories || []).length > 0,
    launch: (project.releases || []).length > 0,
    measure: (project.releases || []).some((r) => r.date && r.date <= today)
  };
  const idx = STAGES.findIndex((s) => !done[s.id]);
  return { done, current: STAGES[idx === -1 ? STAGES.length - 1 : idx].id };
}

// A downstream artifact is stale when the PDN above it was generated from an
// older BRD version than the BRD currently carries.
function staleCount(project) {
  const stalePdnIds = new Set(
    (project.pdns || [])
      .filter((pdn) => {
        const brd = (project.brds || []).find((b) => b.id === pdn.brdId);
        return brd && pdn.brdVersion < (brd.versions || []).length;
      })
      .map((p) => p.id)
  );
  if (!stalePdnIds.size) return 0;
  const epics = (project.epics || []).filter((e) => stalePdnIds.has(e.pdnId));
  const epicIds = new Set(epics.map((e) => e.id));
  const stories = (project.stories || []).filter((s) => epicIds.has(s.epicId));
  const storyIds = new Set(stories.map((s) => s.id));
  const frs = (project.frs || []).filter((f) => storyIds.has(f.storyId));
  const frIds = new Set(frs.map((f) => f.id));
  const tests = (project.tests || []).filter((t) => frIds.has(t.frId));
  return stalePdnIds.size + epics.length + stories.length + frs.length + tests.length;
}

const today = () => new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function stakeholderUpdate(project) {
  const { current } = stageInfo(project);
  const stale = staleCount(project);
  const counts = ['research', 'brd', 'story', 'test']
    .map((t) => `${(project[TYPE_META[t].key] || []).length} ${TYPE_META[t].label.toLowerCase()}`).join(' · ');
  const rel = (project.releases || [])[0];
  const draftBrds = (project.brds || []).filter((b) => !(b.versions || []).length).length;
  const markdown = `## Where we are
${project.name} is in **${STAGES.find((s) => s.id === current).label}**. ${STAGE_HINT[current]}

## Progress
${counts}

## Releases
${rel ? `- ${rel.name} — ${rel.date} (${(rel.storyIds || []).length} stories)` : '- No release planned yet.'}

## Risks
${stale ? `- ${stale} downstream artifact(s) are stale — upstream BRD moved; regenerate before build starts.` : '- No staleness detected — the chain is consistent.'}
${draftBrds ? '- Draft BRD(s) not yet locked — definition can still drift.' : ''}

## Next
${STAGE_HINT[current]}

---
_Stakeholder update playbook · via API · ${today()}_`;
  return { title: `Stakeholder update — ${today()}`, markdown };
}

module.exports = { stakeholderUpdate };
