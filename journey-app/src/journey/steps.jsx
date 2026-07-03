// Journey step components — health issuance flow.
// Quote-first, 3-step structure: Get a quote → Your details → Review & pay.
import React, { useState } from 'react';
import { inr } from '../lib/api';
import { formatDobInput, dobToIso, ageFromIso } from '../lib/validation';

const REL_LABELS = { SELF: 'Self', SPOUSE: 'Spouse', SON: 'Son', DAUGHTER: 'Daughter', FATHER: 'Father', MOTHER: 'Mother' };
const REL_AVATARS = { SELF: '🧑', SPOUSE: '🧑‍🤝‍🧑', SON: '👦', DAUGHTER: '👧', FATHER: '👴', MOTHER: '👵' };
const SINGLE_RELS = ['SELF', 'SPOUSE', 'FATHER', 'MOTHER'];
const COUNTED_RELS = ['SON', 'DAUGHTER'];

// Plain-English benefit explainers — what each add-on actually does for the
// customer, not just its name. Keyed by core catalog addon code.
const ADDON_EXPLAINERS = {
  BONUS_ACCELERATOR: 'Every claim-free year grows your cover — up to 100% extra sum insured.',
  LIMITLESS_SHIELD: 'Once in a lifetime, one claim with no upper limit — for the catastrophic event.',
  EARLY_COVER: 'Cuts the waiting period for pre-existing diseases from 36 months to just 12.',
  OPD_CARE: 'Doctor consultations, diagnostics and teleconsults covered — cashless.',
  COVER_ESCALATOR: 'Your sum insured rises automatically every year to keep pace with inflation.',
  ROOM_FLEX: 'Pick any hospital room category — no rent caps, no proportional deductions.',
  CONSUMABLES_COVER: 'Pays for gloves, syringes and other non-medical items bills usually exclude.'
};

const fmtSI = (v) => (v >= 10000000 ? `₹${v / 10000000} Cr` : `₹${v / 100000} L`);

// ---- DOB text field with auto-slash + live age badge ----
function DobField({ member, onChange }) {
  const iso = dobToIso(member.dobText);
  const age = ageFromIso(iso);
  return (
    <div className="dobrow">
      <span className="mlabel">{REL_AVATARS[member.relationship]} {REL_LABELS[member.relationship]}</span>
      <input
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        value={member.dobText}
        onChange={(e) => {
          const dobText = formatDobInput(e.target.value);
          onChange({ ...member, dobText, dob: dobToIso(dobText) || '' });
        }}
      />
      {member.dobText.length === 10 && (
        iso ? <span className="agebadge">{age} yrs</span> : <span className="agebadge bad">invalid date</span>
      )}
    </div>
  );
}

// ---- Step 1: get a quote (members + cover + add-ons, live premium) ----
export function QuoteStep({ catalog, members, setMembers, pincode, setPincode, quote, setQuote, premium, busy }) {
  const bands = catalog?.sum_insured_bands || [];   // sum_insured_bands come from core catalog API
  const tenureDiscounts = catalog?.tenure_discount_pct || {};

  const newMember = (rel) => ({ relationship: rel, dob: '', dobText: '', ped: null, declarations: {} });
  const toggleSingle = (rel) => {
    const exists = members.find((m) => m.relationship === rel);
    setMembers(exists ? members.filter((m) => m !== exists) : [...members, newMember(rel)]);
  };
  const countOf = (rel) => members.filter((m) => m.relationship === rel).length;
  const addCounted = (rel) => setMembers([...members, newMember(rel)]);
  const removeCounted = (rel) => {
    const idx = members.map((m) => m.relationship).lastIndexOf(rel);
    if (idx >= 0) setMembers(members.filter((_, i) => i !== idx));
  };
  const updateMember = (i, next) => setMembers(members.map((m, j) => (j === i ? next : m)));

  const setPed = (i, val) => {
    const m = members[i];
    // "No conditions" answers every declaration as No in one tap.
    const declarations = val ? m.declarations : Object.fromEntries((catalog?.medical_questions || []).map((q) => [q.code, false]));
    updateMember(i, { ...m, ped: val, declarations, ped_declared: val ? m.ped_declared : false });
  };
  const setDeclaration = (i, code, val) => {
    const m = members[i];
    const declarations = { ...m.declarations, [code]: val };
    updateMember(i, { ...m, declarations, ped_declared: Object.values(declarations).some(Boolean) });
  };

  const toggleAddon = (code) => setQuote({
    ...quote,
    addons: quote.addons.includes(code) ? quote.addons.filter((a) => a !== code) : [...quote.addons, code]
  });
  const addonPrice = (a) => (a.flat ? `${inr(a.flat)}/yr` : `+${a.pct}% of base`);

  return (
    <div className="quotegrid">
      <div>
        <h2>Get your quote</h2>
        <p className="hint">Everything that decides your premium, on one page. The price updates live as you go.</p>

        <label>Who are we covering?</label>
        <div className="memberrow">
          {SINGLE_RELS.map((rel) => (
            <button key={rel} className={'membercard ' + (countOf(rel) ? 'on' : '')} onClick={() => toggleSingle(rel)}>
              <span className="avatar">{REL_AVATARS[rel]}</span> {REL_LABELS[rel]}
            </button>
          ))}
          {COUNTED_RELS.map((rel) => (
            <span key={rel} className={'membercard ' + (countOf(rel) ? 'on' : '')}>
              <span className="avatar">{REL_AVATARS[rel]}</span> {REL_LABELS[rel]}
              <span className="counter">
                <button onClick={() => removeCounted(rel)} aria-label={`remove ${rel}`}>−</button>
                <span>{countOf(rel)}</span>
                <button onClick={() => addCounted(rel)} aria-label={`add ${rel}`}>+</button>
              </span>
            </span>
          ))}
        </div>

        {members.length > 0 && (
          <>
            <label>Date of birth — just type, we'll add the slashes</label>
            {members.map((m, i) => <DobField key={i} member={m} onChange={(next) => updateMember(i, next)} />)}
          </>
        )}

        <label>Pincode</label>
        <input value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="e.g. 400001" style={{ maxWidth: 170 }} />
        <p className="hint">Your pincode decides the pricing zone (metro / non-metro).</p>

        {members.map((m, i) => (
          <div key={'ped' + i}>
            <div className="pedrow">
              <span style={{ fontSize: 14 }}>Any existing illness or medical history for <b>{REL_LABELS[m.relationship]}{COUNTED_RELS.includes(m.relationship) ? ` ${members.slice(0, i + 1).filter((x) => x.relationship === m.relationship).length}` : ''}</b>?</span>
              <span className="toggle2">
                <button className={m.ped === true ? 'on' : ''} onClick={() => setPed(i, true)}>Yes</button>
                <button className={m.ped === false ? 'on' : ''} onClick={() => setPed(i, false)}>No</button>
              </span>
            </div>
            {m.ped === true && (
              <div className="collapse">
                <p className="hint" style={{ marginTop: 0 }}>A "yes" applies a fair PED loading and waiting period — honest declarations keep claims safe.</p>
                {(catalog?.medical_questions || []).map((q) => (
                  <div className="qrow" key={q.code}>
                    <span>{q.text}</span>
                    <span>
                      <button className={'mini ' + (m.declarations[q.code] === true ? 'on' : '')} onClick={() => setDeclaration(i, q.code, true)}>Yes</button>
                      <button className={'mini ' + (m.declarations[q.code] === false ? 'on' : '')} onClick={() => setDeclaration(i, q.code, false)}>No</button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <label>Sum insured</label>
        <div className="chips">
          {bands.map((b) => (
            <button key={b} className={'chip ' + (quote.sum_insured === b ? 'on' : '')} onClick={() => setQuote({ ...quote, sum_insured: b })}>
              {b === 1000000 && <span className="popbadge">POPULAR</span>}
              {fmtSI(b)}
            </button>
          ))}
        </div>

        <label>Policy tenure</label>
        <div className="chips">
          {(catalog?.tenure_options_years || []).map((t) => (
            <button key={t} className={'chip ' + (quote.tenure_years === t ? 'on' : '')} onClick={() => setQuote({ ...quote, tenure_years: t })}>
              {tenureDiscounts[String(t)] && <span className="savebadge">SAVE {tenureDiscounts[String(t)]}%</span>}
              {t} year{t > 1 ? 's' : ''}
            </button>
          ))}
        </div>

        <label>Add-ons — what each one does for you</label>
        {(catalog?.addons || []).map((a) => {
          const on = quote.addons.includes(a.code);
          return (
            <div className={'addoncard ' + (on ? 'on' : '')} key={a.code}>
              <div>
                <h4>{a.label.split(' (')[0]}</h4>
                <p className="exp">{ADDON_EXPLAINERS[a.code] || a.label}</p>
                <p className="price">{addonPrice(a)}</p>
              </div>
              <button className={'addbtn ' + (on ? 'on' : '')} onClick={() => toggleAddon(a.code)}>{on ? 'Added ✓' : 'Add'}</button>
            </div>
          );
        })}
      </div>

      <div>
        <div className="premiumcard">
          <h3>Your premium</h3>
          {busy ? <p className="hint">Calculating with the core system…</p> : premium ? (
            <>
              <div className="prow"><span>Base premium</span><b>{inr(premium.base)}</b></div>
              <div className="prow"><span>Add-ons</span><b>{inr(premium.addons)}</b></div>
              <div className="prow"><span>Loadings (PED)</span><b>{inr(premium.loadings)}</b></div>
              <div className="prow"><span>Discounts</span><b>−{inr(premium.discounts)}</b></div>
              <div className="prow"><span>GST (18%)</span><b>{inr(premium.gst)}</b></div>
              <div className="prow total"><span>Total · {quote.tenure_years} yr</span><b>{inr(premium.total)}</b></div>
              <p className="hint">Zone {premium.zone?.slice(-1)} pricing · rated live by the core policy system</p>
            </>
          ) : <p className="hint">Add members, dates of birth and pincode — your price appears here instantly.</p>}
        </div>
      </div>
    </div>
  );
}

// ---- Step 2: your details (mobile OTP, proposer, optional nominee) ----
export function DetailsStep({ proposer, setProposer, nominee, setNominee, nomineeSkipped, setNomineeSkipped, otp, setOtp }) {
  const setP = (k, v) => setProposer({ ...proposer, [k]: v });
  const setN = (k, v) => { setNomineeSkipped(false); setNominee({ ...(nominee || {}), [k]: v }); };

  const sendOtp = () => {
    if (!/^[6-9]\d{9}$/.test(otp.mobile)) return setOtp({ ...otp, error: 'Enter a valid 10-digit mobile number' });
    setOtp({ ...otp, sent: true, error: '' });
    // Simulated OTP: in production this is an SMS; the demo auto-fills after a beat.
    setTimeout(() => setOtp((o) => ({ ...o, code: '4 8 2 9 1 6', verified: true })), 900);
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <h2>Your details</h2>
      <p className="hint">Mobile-first identity, the way Indian insurance journeys actually work — the OTP is simulated for the demo.</p>

      <label>Mobile number</label>
      <div className="otprow">
        <input
          inputMode="numeric" placeholder="10-digit mobile" maxLength={10} style={{ maxWidth: 220 }}
          value={otp.mobile} disabled={otp.verified}
          onChange={(e) => setOtp({ ...otp, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
        />
        {!otp.verified && <button className="btn" onClick={sendOtp}>{otp.sent ? 'Resend OTP' : 'Send OTP'}</button>}
        {otp.verified && <span className="verified">✓ Verified{otp.code ? ` · OTP ${otp.code} auto-filled (demo)` : ''}</span>}
      </div>
      {otp.error && <p className="error">{otp.error}</p>}
      {otp.sent && !otp.verified && <p className="hint">Verifying…</p>}

      <div className="formgrid" style={{ marginTop: 8 }}>
        <div><label>Full name</label><input value={proposer.name || ''} onChange={(e) => setP('name', e.target.value)} /></div>
        <div><label>Email</label><input value={proposer.email || ''} onChange={(e) => setP('email', e.target.value)} /></div>
        <div><label>PAN</label><input value={proposer.pan || ''} onChange={(e) => setP('pan', e.target.value.toUpperCase().slice(0, 10))} /></div>
      </div>

      <h2 style={{ marginTop: 28 }}>Nominee <span className="hint">(optional at this stage)</span></h2>
      {!nomineeSkipped ? (
        <>
          <div className="formgrid">
            <div><label>Nominee name</label><input value={nominee?.name || ''} onChange={(e) => setN('name', e.target.value)} /></div>
            <div><label>Relation to proposer</label><input value={nominee?.relation || ''} onChange={(e) => setN('relation', e.target.value)} /></div>
            <div><label>Nominee DOB</label><input type="date" value={nominee?.dob || ''} onChange={(e) => setN('dob', e.target.value)} /></div>
          </div>
          {/* ~41% of users skip nominee — measured in journey analytics */}
          <button className="linkbtn" onClick={() => { setNominee(null); setNomineeSkipped(true); }}>Skip for now →</button>
        </>
      ) : <p className="hint">Nominee skipped — can be added before issuance. <button className="linkbtn" onClick={() => setNomineeSkipped(false)}>Add nominee</button></p>}
    </div>
  );
}

// ---- Step 3: review proposal form (fetched from core) + PDF download ----
export function ReviewStep({ form, onDownloadPdf }) {
  if (!form) return <p className="hint">Loading proposal form from the core system…</p>;
  return (
    <div style={{ maxWidth: 720 }}>
      <h2>Review your proposal</h2>
      <p className="hint">Proposal <b>{form.proposal_id}</b> · {form.product}</p>
      <div className="reviewcard">
        <h4>Proposer</h4>
        <p>{form.proposer?.name} · {form.proposer?.mobile} · {form.proposer?.email}</p>
        <h4>Members covered</h4>
        {form.members.map((m, i) => (
          <p key={i}>{REL_AVATARS[m.relationship]} {REL_LABELS[m.relationship]} · age {m.age} {m.ped_declared && <span className="tagwarn">PED declared</span>}</p>
          /* TODO(PROD-2311): show per-member PED waiting months here —
             blocked: field not exposed in proposal-v2 contract response */
        ))}
        <h4>Cover</h4>
        <p>{inr(form.cover.sum_insured)} sum insured · {form.cover.tenure_years} year(s) · Add-ons: {form.cover.addons.length ? form.cover.addons.map((a) => a.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())).join(', ') : 'none'}</p>
        <h4>Nominee</h4>
        <p>{form.nominee ? `${form.nominee.name} (${form.nominee.relation})` : 'Not provided (optional at proposal stage)'}</p>
        <h4>Premium</h4>
        <p className="bigpremium">{inr(form.premium.total)} <span className="hint">incl. GST</span></p>
        <p className="hint">{form.declarations_note}</p>
      </div>
      <button className="btn ghost" onClick={onDownloadPdf}>⬇ Download proposal form (PDF)</button>
    </div>
  );
}

// ---- Success + handoff into the AI portal ----
export function SuccessScreen({ policyNo, proposalId, mode }) {
  return (
    <div className="success">
      <div className="bigtick">✓</div>
      <h2>Policy issued instantly</h2>
      <p className="hint">Proposal {proposalId} · payment confirmed by the core policy system{mode === 'agent' ? ' · customer paid via payment link' : ''}</p>
      <p className="policyno">{policyNo}</p>
      <p className="hint">Policy document &amp; health card sent to your registered email (demo).</p>

      <div className="handoff">
        <h3>That was the easy part.</h3>
        <p>
          You just used a real issuance system — rules engine, rating, proposal lifecycle, payments.
          The actual demo is what sits on top: an AI portal that reads this system's <b>source code</b> to
          tell a product manager whether a change is feasible — with file-and-line evidence.
        </p>
        <a className="btn gold" href="/ai?from=journey">See the AI feasibility portal →</a>
      </div>
    </div>
  );
}
