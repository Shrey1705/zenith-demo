// Journey step components — health issuance flow.
import React from 'react';
import { inr } from '../lib/api';

const REL_LABELS = { SELF: 'Self', SPOUSE: 'Spouse', SON: 'Son', DAUGHTER: 'Daughter', FATHER: 'Father', MOTHER: 'Mother' };

// ---- Step 1: who to insure ----
export function MembersStep({ catalog, members, setMembers, pincode, setPincode }) {
  const toggle = (rel) => {
    const exists = members.find(m => m.relationship === rel && (rel === 'SELF' || rel === 'SPOUSE' || rel === 'FATHER' || rel === 'MOTHER'));
    if (exists) setMembers(members.filter(m => m !== exists));
    else setMembers([...members, { relationship: rel, dob: '', declarations: {} }]);
  };
  const addChild = (rel) => setMembers([...members, { relationship: rel, dob: '', declarations: {} }]);
  return (
    <div>
      <h2>Who would you like to insure?</h2>
      <p className="hint">Pick everyone to be covered under one family-floater style policy.</p>
      <div className="chips">
        {(catalog?.permitted_relationships || []).map(rel => (
          <button key={rel}
            className={'chip ' + (members.some(m => m.relationship === rel) ? 'on' : '')}
            onClick={() => (rel === 'SON' || rel === 'DAUGHTER') ? addChild(rel) : toggle(rel)}>
            {REL_LABELS[rel]}{(rel === 'SON' || rel === 'DAUGHTER') ? ' +' : ''}
          </button>
        ))}
      </div>
      {members.length > 0 && <p className="hint">{members.length} member(s) selected: {members.map(m => REL_LABELS[m.relationship]).join(', ')}</p>}
      <label>Pincode</label>
      <input value={pincode} onChange={e => setPincode(e.target.value)} placeholder="e.g. 400001" maxLength={6} />
      <p className="hint">Pincode decides your pricing zone (metro / non-metro).</p>
    </div>
  );
}

// ---- Step 2: member details ----
export function DetailsStep({ members, setMembers }) {
  const set = (i, dob) => setMembers(members.map((m, j) => j === i ? { ...m, dob } : m));
  return (
    <div>
      <h2>Tell us about each member</h2>
      {members.map((m, i) => (
        <div className="memberrow" key={i}>
          <span className="mlabel">{REL_LABELS[m.relationship]}</span>
          <input type="date" value={m.dob} onChange={e => set(i, e.target.value)} />
        </div>
      ))}
      <p className="hint">Adults 18–65 · children 91 days–25 years (core underwriting rules validate this on quote).</p>
    </div>
  );
}

// ---- Step 3: medical declarations ----
export function MedicalStep({ catalog, members, setMembers }) {
  const set = (i, code, val) => setMembers(members.map((m, j) =>
    j === i ? { ...m, declarations: { ...m.declarations, [code]: val }, ped_declared: Object.values({ ...m.declarations, [code]: val }).some(Boolean) } : m));
  return (
    <div>
      <h2>Medical &amp; lifestyle declarations</h2>
      <p className="hint">Honest declarations keep claims safe. A “yes” applies a PED loading and waiting period per core rules.</p>
      {members.map((m, i) => (
        <div className="declblock" key={i}>
          <h4>{REL_LABELS[m.relationship]}</h4>
          {(catalog?.medical_questions || []).map(q => (
            <div className="qrow" key={q.code}>
              <span>{q.text}</span>
              <span>
                <button className={'mini ' + (m.declarations[q.code] === true ? 'on' : '')} onClick={() => set(i, q.code, true)}>Yes</button>
                <button className={'mini ' + (m.declarations[q.code] === false ? 'on' : '')} onClick={() => set(i, q.code, false)}>No</button>
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---- Step 4: quote — SI, tenure, add-ons, live premium from core ----
export function QuoteStep({ catalog, quote, setQuote, premium, busy }) {
  const bands = catalog?.sum_insured_bands || [];   // sum_insured_bands come from core catalog API
  const fmtSI = (v) => v >= 10000000 ? `₹${v / 10000000} Cr` : `₹${v / 100000} L`;
  const toggleAddon = (code) => setQuote({
    ...quote, addons: quote.addons.includes(code) ? quote.addons.filter(a => a !== code) : [...quote.addons, code]
  });
  return (
    <div className="quotegrid">
      <div>
        <h2>Customise your cover</h2>
        <label>Sum insured</label>
        <div className="chips">
          {bands.map(b => <button key={b} className={'chip ' + (quote.sum_insured === b ? 'on' : '')} onClick={() => setQuote({ ...quote, sum_insured: b })}>{fmtSI(b)}</button>)}
        </div>
        <label>Policy tenure</label>
        <div className="chips">
          {(catalog?.tenure_options_years || []).map(t => <button key={t} className={'chip ' + (quote.tenure_years === t ? 'on' : '')} onClick={() => setQuote({ ...quote, tenure_years: t })}>{t} year{t > 1 ? 's' : ''}</button>)}
        </div>
        <label>Add-ons</label>
        {(catalog?.addons || []).map(a => (
          <div className="addonrow" key={a.code}>
            <input type="checkbox" id={a.code} checked={quote.addons.includes(a.code)} onChange={() => toggleAddon(a.code)} />
            <label htmlFor={a.code}>{a.label} <span className="hint">({a.flat ? inr(a.flat) : `+${a.pct}%`})</span></label>
          </div>
        ))}
      </div>
      <div className="premiumcard">
        <h3>Your premium</h3>
        {busy ? <p className="hint">Calculating with core system…</p> : premium ? (
          <>
            <div className="prow"><span>Base premium</span><b>{inr(premium.base)}</b></div>
            <div className="prow"><span>Add-ons</span><b>{inr(premium.addons)}</b></div>
            <div className="prow"><span>Loadings (PED)</span><b>{inr(premium.loadings)}</b></div>
            <div className="prow"><span>Discounts</span><b>−{inr(premium.discounts)}</b></div>
            <div className="prow"><span>GST (18%)</span><b>{inr(premium.gst)}</b></div>
            <div className="prow total"><span>Total ({quote.tenure_years} yr)</span><b>{inr(premium.total)}</b></div>
            <p className="hint">Zone {premium.zone?.slice(-1)} pricing · rated live by core-policy-system</p>
          </>
        ) : <p className="hint">Premium appears once details are complete.</p>}
      </div>
    </div>
  );
}

// ---- Step 5: proposer + nominee (nominee optional/skippable) ----
export function ProposerStep({ proposer, setProposer, nominee, setNominee, nomineeSkipped, setNomineeSkipped }) {
  const setP = (k, v) => setProposer({ ...proposer, [k]: v });
  const setN = (k, v) => { setNomineeSkipped(false); setNominee({ ...(nominee || {}), [k]: v }); };
  return (
    <div>
      <h2>Proposer details</h2>
      <div className="formgrid">
        <div><label>Full name</label><input value={proposer.name || ''} onChange={e => setP('name', e.target.value)} /></div>
        <div><label>Mobile</label><input value={proposer.mobile || ''} onChange={e => setP('mobile', e.target.value)} maxLength={10} /></div>
        <div><label>Email</label><input value={proposer.email || ''} onChange={e => setP('email', e.target.value)} /></div>
        <div><label>PAN</label><input value={proposer.pan || ''} onChange={e => setP('pan', e.target.value.toUpperCase())} maxLength={10} /></div>
      </div>
      <h2 style={{ marginTop: 24 }}>Nominee <span className="hint">(optional at this stage)</span></h2>
      {!nomineeSkipped ? (
        <>
          <div className="formgrid">
            <div><label>Nominee name</label><input value={nominee?.name || ''} onChange={e => setN('name', e.target.value)} /></div>
            <div><label>Relation to proposer</label><input value={nominee?.relation || ''} onChange={e => setN('relation', e.target.value)} /></div>
            <div><label>Nominee DOB</label><input type="date" value={nominee?.dob || ''} onChange={e => setN('dob', e.target.value)} /></div>
          </div>
          {/* ~41% of users skip nominee — measured in journey analytics */}
          <button className="linkbtn" onClick={() => { setNominee(null); setNomineeSkipped(true); }}>Skip for now →</button>
        </>
      ) : <p className="hint">Nominee skipped — can be added before issuance. <button className="linkbtn" onClick={() => setNomineeSkipped(false)}>Add nominee</button></p>}
    </div>
  );
}

// ---- Step 6: review proposal form (fetched from core) ----
export function ReviewStep({ form }) {
  if (!form) return <p className="hint">Loading proposal form from core system…</p>;
  return (
    <div>
      <h2>Review your proposal</h2>
      <p className="hint">Proposal <b>{form.proposal_id}</b> · {form.product}</p>
      <div className="reviewcard">
        <h4>Proposer</h4>
        <p>{form.proposer?.name} · {form.proposer?.mobile} · {form.proposer?.email}</p>
        <h4>Members covered</h4>
        {form.members.map((m, i) => (
          <p key={i}>{REL_LABELS[m.relationship]} · age {m.age} {m.ped_declared && <span className="tagwarn">PED declared</span>}</p>
          /* TODO(PROD-2311): show per-member PED waiting months here —
             blocked: field not exposed in proposal-v2 contract response */
        ))}
        <h4>Cover</h4>
        <p>{inr(form.cover.sum_insured)} sum insured · {form.cover.tenure_years} year(s) · Add-ons: {form.cover.addons.length ? form.cover.addons.join(', ') : 'none'}</p>
        <h4>Nominee</h4>
        <p>{form.nominee ? `${form.nominee.name} (${form.nominee.relation})` : 'Not provided (optional at proposal stage)'}</p>
        <h4>Premium</h4>
        <p className="bigpremium">{inr(form.premium.total)} <span className="hint">incl. GST</span></p>
        <p className="hint">{form.declarations_note}</p>
      </div>
    </div>
  );
}

// ---- Success ----
export function SuccessScreen({ policyNo, proposalId, mode }) {
  return (
    <div className="success">
      <div className="bigtick">✓</div>
      <h2>Policy issued instantly!</h2>
      <p>Policy number</p>
      <p className="policyno">{policyNo}</p>
      <p className="hint">Proposal {proposalId} · payment confirmed by core-policy-system{mode === 'agent' ? ' · customer paid via payment link' : ''}</p>
      <p className="hint">Policy document & health card sent to registered email (demo).</p>
    </div>
  );
}
