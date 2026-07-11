// Lifecycle stage indicator — Discover → Define → Build → Launch → Measure.
// Stages are computed from what actually exists (research, BRD versions,
// stories, releases), so this can never disagree with the project. The full
// strip sits above every project page; the compact dots live on dashboards.
import React from 'react';
import { I } from './icons';
import { STAGES, STAGE_HINT, stageInfo } from './workspace';

export default function StageStrip({ project, compact }) {
  const { done, current } = stageInfo(project);

  if (compact) {
    return (
      <span className="stagedots" title={`Current stage: ${STAGES.find((s) => s.id === current)?.label}`}>
        {STAGES.map((s) => (
          <i key={s.id} className={(done[s.id] ? 'd' : '') + (current === s.id ? ' c' : '')} />
        ))}
        <em>{STAGES.find((s) => s.id === current)?.label}</em>
      </span>
    );
  }

  return (
    <div className="stagestrip">
      <div className="stageseg">
        {STAGES.map((s) => {
          const isCur = current === s.id;
          const isDone = done[s.id];
          return (
            <span key={s.id} className={'stage' + (isDone ? ' done' : '') + (isCur ? ' cur' : '')} title={STAGE_HINT[s.id]}>
              {isDone && !isCur ? <I n="check" s={11} sw={2.2} /> : null}
              {s.label}
            </span>
          );
        })}
      </div>
      <span className="stagehint">{STAGE_HINT[current]}</span>
    </div>
  );
}
