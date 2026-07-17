// Decisions — the record of *why*. A decision is the first-class object at
// the top of the chain: it captures the alternatives, evidence, assumptions
// and confidence at the moment of choosing, links down to the spec it
// produced, and closes the loop on its review date with a measured outcome
// and lessons. This is what turns Zenith from a spec tool into memory.
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { I, TypeIcon } from './icons';
import TraceRail from './TraceRail';
import {
  useWS, mutate, uid, now, shortDate, findProject, findDecision, can,
  newDecision, addDecision, updateDecision, removeDecision, isDecisionDue,
  DECISION_STATUS, DECISION_STATUS_LABEL, confidencePct, addDoc
} from './workspace';

const CONF = ['low', 'medium', 'high'];

export default function DecisionsPage() {
  const { pid, docId } = useParams();
  const nav = useNavigate();
  const ws = useWS();
  const project = findProject(ws, pid);
  const editable = can(ws, 'edit');
  const decision = docId ? findDecision(project, docId) : null;

  if (decision) return <DecisionDetail project={project} decision={decision} editable={editable} nav={nav} />;

  const create = () => {
    const d = newDecision({ title: 'New decision', status: 'waiting', ownerId: (ws.team?.members?.[0]?.id) || 'owner' });
    mutate((w) => addDecision(w, pid, d));
    nav(`/ai/p/${pid}/decisions/${d.id}`);
  };

  const list = project.decisions || [];
  return (
    <div className="docwrap">
      <h1 className="doch1">Decisions</h1>
      <p className="docsub">
        The record of <b>why</b> — every choice with its alternatives, evidence and confidence, linked to the spec it produced and revisited on its review date.
        {!editable && ' Read-only role: decisions can be read, not changed.'}
      </p>

      <div className="klist">
        {list.map((d) => {
          const due = isDecisionDue(d);
          return (
            <button key={d.id} className={'krow' + (due ? ' duerow' : '')} onClick={() => nav(`/ai/p/${pid}/decisions/${d.id}`)}>
              <span className="krowmain">
                <span className="krowtitle"><TypeIcon type="decision" s={14} /> {d.title}</span>
                <span className="krowmeta">
                  {DECISION_STATUS_LABEL[d.status]} · {confidencePct(d.confidence)}% confidence · {(d.evidenceIds || []).length} evidence
                  {d.reviewDate ? ` · review ${shortDate(d.reviewDate + 'T00:00:00')}` : ''}
                </span>
              </span>
              {due && <span className="duepill"><I n="refresh" s={11} /> Due for review</span>}
            </button>
          );
        })}
        {!list.length && <p className="railempty">No decisions yet. Record the first one — it becomes the top of the chain and the start of your organizational memory.</p>}
      </div>

      {editable && <button className="btn" style={{ marginTop: 20 }} onClick={create}><I n="plus" s={13} /> Record a decision</button>}
    </div>
  );
}

function DecisionDetail({ project, decision, editable, nav }) {
  const ws = useWS();
  const pid = project.id;
  const d = decision;
  const patch = (p) => mutate((w) => updateDecision(w, pid, d.id, p));
  const [confirmDel, setConfirmDel] = useState(false);
  const due = isDecisionDue(d);
  const members = ws.team?.members || [];
  const memberName = (id) => members.find((m) => m.id === id)?.email || 'Owner';
  const research = project.research || [];
  const linkedBrd = d.brdId ? (project.brds || []).find((b) => b.id === d.brdId) : null;

  const toggleEvidence = (rid) => patch({ evidenceIds: (d.evidenceIds || []).includes(rid) ? d.evidenceIds.filter((x) => x !== rid) : [...(d.evidenceIds || []), rid] });
  const setAssumption = (i, p) => patch({ assumptions: d.assumptions.map((a, j) => (j === i ? { ...a, ...p } : a)) });
  const addAssumption = () => patch({ assumptions: [...(d.assumptions || []), { text: '', confidence: 'medium' }] });
  const setAlt = (i, p) => patch({ alternatives: d.alternatives.map((a, j) => (j === i ? { ...a, ...p } : a)) });
  const addAlt = () => patch({ alternatives: [...(d.alternatives || []), { option: '', whyNot: '' }] });

  // Draft the spec: create a BRD linked back to this decision, carrying the
  // context so the chain literally grows out of the decision.
  const draftSpec = () => {
    if (linkedBrd) { nav(`/ai/p/${pid}/brds/${linkedBrd.id}`); return; }
    const sections = {
      background: d.context || '',
      requirements: d.chosen ? [d.chosen] : ['Refine from the decision'],
      stakeholders: '', success: ''
    };
    const brd = { id: uid(), title: `Spec — ${d.title}`, owner: 'PM', status: 'Draft', decisionId: d.id, researchIds: [...(d.evidenceIds || [])], sections, createdAt: now(), versions: [] };
    mutate((w) => {
      let next = addDoc(w, pid, 'brd', brd);
      return updateDecision(next, pid, d.id, { brdId: brd.id });
    });
    nav(`/ai/p/${pid}/brds/${brd.id}`);
  };

  const recordOutcome = (outcome, lessons) => patch({ outcome, lessons, status: 'validated' });

  const actions = editable ? [
    { label: linkedBrd ? 'Open the spec →' : 'Draft the spec from this decision', run: draftSpec, hint: 'Create a BRD linked to this decision' }
  ] : [];

  const versionsRail = (
    <section>
      <h4>At a glance</h4>
      <p className="railmeta">Owner: {memberName(d.ownerId)}</p>
      {d.approverId && <p className="railmeta">Approver: {memberName(d.approverId)}</p>}
      <p className="railmeta">Status: {DECISION_STATUS_LABEL[d.status]}</p>
      <p className="railmeta">Confidence: {confidencePct(d.confidence)}%</p>
      {d.reviewDate && <p className="railmeta">Review: {shortDate(d.reviewDate + 'T00:00:00')}</p>}
    </section>
  );

  return (
    <div className="docwrap">
      <button className="linkbtn" onClick={() => nav(`/ai/p/${pid}/decisions`)}>← Decisions</button>
      <div className="docpane">
        <article className="docbody">
        {due && (
          <div className="duebar">
            <span><I n="refresh" s={13} /> This decision passed its review date ({shortDate(d.reviewDate + 'T00:00:00')}) with no outcome recorded. Close the loop below — what actually happened?</span>
          </div>
        )}

        <p className="doctype"><TypeIcon type="decision" s={13} /> Decision · {DECISION_STATUS_LABEL[d.status]}</p>
        {editable
          ? <input className="dectitle" value={d.title} onChange={(e) => patch({ title: e.target.value })} />
          : <h1>{d.title}</h1>}

        {editable && (
          <div className="decmetarow">
            <label>Status
              <select value={d.status} onChange={(e) => patch({ status: e.target.value })}>
                {DECISION_STATUS.map((s) => <option key={s} value={s}>{DECISION_STATUS_LABEL[s]}</option>)}
              </select>
            </label>
            <label>Owner
              <select value={d.ownerId || ''} onChange={(e) => patch({ ownerId: e.target.value })}>
                {members.map((m) => <option key={m.id} value={m.id}>{m.email}</option>)}
              </select>
            </label>
            <label>Approver
              <select value={d.approverId || ''} onChange={(e) => patch({ approverId: e.target.value || null })}>
                <option value="">— none —</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.email}</option>)}
              </select>
            </label>
            <label>Review date
              <input type="date" value={d.reviewDate || ''} onChange={(e) => patch({ reviewDate: e.target.value })} />
            </label>
          </div>
        )}

        <Field label="Context — what prompted this?" value={d.context} editable={editable} onChange={(v) => patch({ context: v })} placeholder="The situation and the question being decided." />
        <Field label="Decision — what we chose" value={d.chosen} editable={editable} onChange={(v) => patch({ chosen: v })} placeholder="The option we committed to." />

        <h3 className="docsecth">Confidence</h3>
        {editable ? (
          <div className="confrow">
            <input type="range" min="0" max="100" value={confidencePct(d.confidence)} onChange={(e) => patch({ confidence: Number(e.target.value) / 100 })} />
            <b>{confidencePct(d.confidence)}%</b>
          </div>
        ) : <p className="docpara"><b>{confidencePct(d.confidence)}%</b></p>}

        <h3 className="docsecth">Alternatives considered</h3>
        {(d.alternatives || []).map((a, i) => (
          <div className="altrow" key={i}>
            {editable ? (
              <>
                <input value={a.option} placeholder="Option not taken" onChange={(e) => setAlt(i, { option: e.target.value })} />
                <input value={a.whyNot} placeholder="Why not" onChange={(e) => setAlt(i, { whyNot: e.target.value })} />
                <button className="fs-linkbtn" onClick={() => patch({ alternatives: d.alternatives.filter((_, j) => j !== i) })}>×</button>
              </>
            ) : <p className="docpara"><b>{a.option}</b> — {a.whyNot}</p>}
          </div>
        ))}
        {editable && <button className="fs-linkbtn" onClick={addAlt}>+ Add alternative</button>}

        <h3 className="docsecth">Assumptions</h3>
        {(d.assumptions || []).map((a, i) => (
          <div className="altrow" key={i}>
            {editable ? (
              <>
                <input value={a.text} placeholder="Assumption we're betting on" onChange={(e) => setAssumption(i, { text: e.target.value })} />
                <select value={a.confidence} onChange={(e) => setAssumption(i, { confidence: e.target.value })}>
                  {CONF.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button className="fs-linkbtn" onClick={() => patch({ assumptions: d.assumptions.filter((_, j) => j !== i) })}>×</button>
              </>
            ) : <p className="docpara">{a.text} <span className={'confchip ' + a.confidence}>{a.confidence}</span></p>}
          </div>
        ))}
        {editable && <button className="fs-linkbtn" onClick={addAssumption}>+ Add assumption</button>}

        <h3 className="docsecth">Evidence</h3>
        <p className="hint">Link the research, interviews and captured notes this rests on. Evidence sent in via Gmail/WhatsApp appears here too.</p>
        <div className="evidencelist">
          {research.map((r) => {
            const on = (d.evidenceIds || []).includes(r.id);
            return (
              <label key={r.id} className={'evidencerow' + (on ? ' on' : '')}>
                {editable && <input type="checkbox" checked={on} onChange={() => toggleEvidence(r.id)} />}
                <TypeIcon type="research" s={13} />
                <span>{r.title}</span>
                {on && !editable && <I n="check" s={12} />}
              </label>
            );
          })}
          {!research.length && <p className="railempty">No research yet — add some, then link it as evidence.</p>}
        </div>

        <h3 className="docsecth">Impact</h3>
        <Field label="Business" value={d.impact?.business} editable={editable} onChange={(v) => patch({ impact: { ...d.impact, business: v } })} small />
        <Field label="Technical" value={d.impact?.technical} editable={editable} onChange={(v) => patch({ impact: { ...d.impact, technical: v } })} small />
        <Field label="Customer" value={d.impact?.customer} editable={editable} onChange={(v) => patch({ impact: { ...d.impact, customer: v } })} small />

        <h3 className="docsecth">Outcome &amp; lessons {d.outcome ? '' : <span className="hint">— filled after the review date</span>}</h3>
        <OutcomePanel decision={d} editable={editable} due={due} onRecord={recordOutcome} onEdit={(p) => patch(p)} />

        {editable && (
          <div style={{ marginTop: 30 }}>
            {confirmDel
              ? <span>Delete this decision? <button className="fs-linkbtn" onClick={() => { mutate((w) => removeDecision(w, pid, d.id)); nav(`/ai/p/${pid}/decisions`); }}>Yes, delete</button> · <button className="fs-linkbtn" onClick={() => setConfirmDel(false)}>cancel</button></span>
              : <button className="fs-linkbtn" onClick={() => setConfirmDel(true)}>Delete decision</button>}
          </div>
        )}
        </article>
        <TraceRail project={project} type="decision" doc={d} actions={actions} extra={versionsRail} />
      </div>
    </div>
  );
}

function OutcomePanel({ decision, editable, due, onRecord, onEdit }) {
  const d = decision;
  const [outcome, setOutcome] = useState(d.outcome || '');
  const [lessons, setLessons] = useState(d.lessons || '');
  if (d.outcome) {
    return (
      <div className="outcomebox done">
        <p className="docpara"><b>Outcome:</b> {editable ? <input value={outcome} onChange={(e) => { setOutcome(e.target.value); onEdit({ outcome: e.target.value }); }} /> : d.outcome}</p>
        <p className="docpara"><b>Lessons:</b> {editable ? <input value={lessons} onChange={(e) => { setLessons(e.target.value); onEdit({ lessons: e.target.value }); }} /> : d.lessons}</p>
      </div>
    );
  }
  if (!editable) return <p className="railempty">No outcome recorded yet.</p>;
  return (
    <div className={'outcomebox' + (due ? ' due' : '')}>
      <input value={outcome} placeholder="What actually happened? (the measured outcome)" onChange={(e) => setOutcome(e.target.value)} />
      <input value={lessons} placeholder="What did we learn for next time?" onChange={(e) => setLessons(e.target.value)} />
      <button className="btn" disabled={!outcome.trim()} onClick={() => onRecord(outcome.trim(), lessons.trim())}>Record outcome &amp; close the loop</button>
    </div>
  );
}

function Field({ label, value, editable, onChange, placeholder, small }) {
  return (
    <div style={{ marginTop: small ? 8 : 14 }}>
      <label className="fieldlabel">{label}</label>
      {editable
        ? (small
            ? <input className="fieldinput" value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
            : <textarea className="fieldarea" value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />)
        : <p className="docpara">{value || <span className="railempty">—</span>}</p>}
    </div>
  );
}
