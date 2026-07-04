// Journey step components — health issuance flow.
// Quote-first, 3-step structure: Get a quote → Your details → Review & pay.
import React from 'react';
import { inr } from '../lib/api';
import { formatDobInput, dobToIso, ageFromIso, fieldClass, validatePincode, isPanFormat, siLabel } from '../lib/validation';
import BaseCovers from './BaseCovers';
import OptionalBenefits from './OptionalBenefits';
import Discounts from './Discounts';
import HospitalNetwork from './HospitalNetwork';

const REL_LABELS = { SELF: 'Self', SPOUSE: 'Spouse', SON: 'Son', DAUGHTER: 'Daughter', FATHER: 'Father', MOTHER: 'Mother' };
const REL_AVATARS = { SELF: '🧑', SPOUSE: '🧑‍🤝‍🧑', SON: '👦', DAUGHTER: '👧', FATHER: '👴', MOTHER: '👵' };
const SINGLE_RELS = ['SELF', 'SPOUSE', 'FATHER', 'MOTHER'];
const COUNTED_RELS = ['SON', 'DAUGHTER'];

// Numbered section card — the quote page is a single column of these, each
// with a symmetric grid inside (equal boxes for equal content).
function Section({ n, title, subtitle, children }) {
  return (
    <section className="qsection">
      <div className="qsecthead">
        <span className="qnum">{n}</span>
        <span>
          <h3>{title}</h3>
          {subtitle && <p className="qsub">{subtitle}</p>}
        </span>
      </div>
      {children}
    </section>
  );
}

// ---- DOB text field: auto-slash input, ✓ on valid, age in its own chip ----
function DobField({ member, onChange, tourTarget }) {
  const iso = dobToIso(member.dobText);
  const age = ageFromIso(iso);
  const cls = fieldClass(member.dobText, (v) => v.length === 10, () => !!iso);
  return (
    <div className="dobrow">
      <span className="mlabel">{REL_AVATARS[member.relationship]} {REL_LABELS[member.relationship]}</span>
      <input
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        value={member.dobText}
        data-tour={tourTarget}
        className={cls}
        onChange={(e) => {
          const dobText = formatDobInput(e.target.value);
          onChange({ ...member, dobText, dob: dobToIso(dobText) || '' });
        }}
      />
      {member.dobText.length === 10 && (iso
        ? <span className="fieldok">✓</span>
        : <span className="fieldbad">✕</span>)}
      <span className={'agechip' + (iso ? ' on' : '')}>{iso ? `${age} yrs` : 'Age'}</span>
    </div>
  );
}

// ---- Step 1: get a quote ----
export function QuoteStep({ catalog, members, setMembers, pincode, setPincode, quote, setQuote, planQuotes, onSelectPlan, toggleDiscount }) {
  const bands = catalog?.sum_insured_bands || [];
  const tenureDiscounts = catalog?.tenure_discount_pct || {};
  const maxKids = catalog?.max_children ?? 4;
  const variants = catalog?.plan_variants || [];
  const planCards = planQuotes?.plans || variants.map((v) => ({ ...v, premium: null }));
  const tierCards = planCards.filter((v) => !v.custom);
  const byoCard = planCards.find((v) => v.custom);
  const selectedVariant = variants.find((v) => v.code === quote.plan);

  const newMember = (rel) => ({ relationship: rel, dob: '', dobText: '', ped: null, declarations: {} });
  const toggleSingle = (rel) => {
    const exists = members.find((m) => m.relationship === rel);
    setMembers(exists ? members.filter((m) => m !== exists) : [...members, newMember(rel)]);
  };
  const countOf = (rel) => members.filter((m) => m.relationship === rel).length;
  const kidCount = countOf('SON') + countOf('DAUGHTER');
  const addCounted = (rel) => { if (kidCount < maxKids) setMembers([...members, newMember(rel)]); };
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
    addons: (quote.addons || []).includes(code) ? quote.addons.filter((a) => a !== code) : [...(quote.addons || []), code]
  });

  const pincodeCls = fieldClass(pincode, (v) => v.length === 6, validatePincode);

  const planCardEl = (v, cls = '') => {
    const on = quote.plan === v.code;
    return (
      <div className={'plancard ' + cls + (on ? ' on' : '')} key={v.code} style={{ '--plancolor': v.color }}>
        <span className="planbar" />
        {v.recommended && <span className="recbadge">RECOMMENDED</span>}
        <div className="planhead">
          <span className="planicon">{v.icon}</span>
          <span className="plantitle">
            <h4>{v.label}</h4>
            <p className="exp">{v.tagline}</p>
          </span>
          <span className="planprice">
            {v.premium ? <>{inr(v.premium.total)}<small>/{quote.tenure_years} yr</small></> : <small>complete steps 1–4</small>}
          </span>
        </div>
        <ul className="planbenefits">
          {v.benefits.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
        <button className={'addbtn ' + (on ? 'on' : '')} onClick={() => onSelectPlan(v.code)}>
          {on ? 'Selected ✓' : `Select ${v.label}`}
        </button>
      </div>
    );
  };

  return (
    <div className="qsteps">
      <h2>Get your quote</h2>

      <Section n={1} title="Sum insured" subtitle="The cover amount your family can claim in a policy year.">
        <div className="chips">
          {bands.map((b) => (
            <button key={b} className={'chip ' + (quote.sum_insured === b ? 'on' : '')} onClick={() => setQuote({ ...quote, sum_insured: b })}>
              {b === 1000000 && <span className="popbadge">POPULAR</span>}
              {siLabel(b)}
            </button>
          ))}
        </div>
      </Section>

      <Section n={2} title="Policy tenure" subtitle="Longer tenures lock your premium and earn a discount.">
        <div className="chips">
          {(catalog?.tenure_options_years || []).map((t) => (
            <button key={t} className={'chip ' + (quote.tenure_years === t ? 'on' : '')} onClick={() => setQuote({ ...quote, tenure_years: t })}>
              {tenureDiscounts[String(t)] && <span className="savebadge">SAVE {tenureDiscounts[String(t)]}%</span>}
              {t} year{t > 1 ? 's' : ''}
            </button>
          ))}
        </div>
      </Section>

      <Section n={3} title="Your pincode" subtitle="Pricing varies by city.">
        <div className="pinrow">
          <input
            value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="e.g. 400001" className={pincodeCls} data-tour="pincode"
          />
          {pincode.length === 6 && (validatePincode(pincode)
            ? <span className="fieldok">✓</span>
            : <span className="fieldbad">✕</span>)}
        </div>
      </Section>

      <Section n={4} title="Who's being covered?" subtitle={`Up to 4 adults and ${maxKids} children on one policy.`}>
        <div className="adultgrid">
          {SINGLE_RELS.map((rel) => (
            <button key={rel} className={'membercard ' + (countOf(rel) ? 'on' : '')} onClick={() => toggleSingle(rel)}>
              <span className="avatar">{REL_AVATARS[rel]}</span> {REL_LABELS[rel]}
            </button>
          ))}
        </div>
        <div className="kidgrid">
          {COUNTED_RELS.map((rel) => (
            <span key={rel} className={'membercard ' + (countOf(rel) ? 'on' : '')}>
              <span className="avatar">{REL_AVATARS[rel]}</span> {REL_LABELS[rel]}
              <span className="counter">
                <button onClick={() => removeCounted(rel)} aria-label={`remove ${rel}`}>−</button>
                <span>{countOf(rel)}</span>
                <button onClick={() => addCounted(rel)} disabled={kidCount >= maxKids} aria-label={`add ${rel}`}>+</button>
              </span>
            </span>
          ))}
        </div>

        {members.length > 0 && (
          <div className="dobblock">
            <label>Date of birth — dd/mm/yyyy</label>
            {members.map((m, i) => <DobField key={i} member={m} onChange={(next) => updateMember(i, next)} tourTarget={i === 0 ? 'dob-self' : undefined} />)}
          </div>
        )}

        {members.map((m, i) => (
          <div key={'ped' + i} className="pedblock">
            <div className="pedrow">
              <span style={{ fontSize: 13.5 }}>Any medical history for <b>{REL_LABELS[m.relationship]}{COUNTED_RELS.includes(m.relationship) ? ` ${members.slice(0, i + 1).filter((x) => x.relationship === m.relationship).length}` : ''}</b>?</span>
              <span className="toggle2">
                <button className={m.ped === true ? 'on' : ''} onClick={() => setPed(i, true)}>Yes</button>
                <button className={m.ped === false ? 'on' : ''} onClick={() => setPed(i, false)} data-tour={i === 0 ? 'ped-no' : undefined}>No</button>
              </span>
            </div>
            {m.ped === true && (
              <div className="collapse">
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
      </Section>

      <Section n={5} title="Every plan includes" subtitle="Built into all our plans — tap a tile for detail.">
        <BaseCovers catalog={catalog} />
      </Section>

      <Section n={6} title="Choose your plan" subtitle="Every plan can be customised with optional benefits below.">
        <div className="plangrid">
          {tierCards.map((v) => planCardEl(v))}
        </div>
        {byoCard && (
          <div className="byo">
            {planCardEl(byoCard, 'byocard ')}
          </div>
        )}
      </Section>

      <Section n={7} title={`Optional benefits${selectedVariant ? ` — customise your ${selectedVariant.label} plan` : ''}`} subtitle="Add covers à la carte; included ones are already part of your plan.">
        <OptionalBenefits catalog={catalog} quote={quote} toggleAddon={toggleAddon} selectedVariant={selectedVariant} />
      </Section>

      <Section n={8} title="Discounts" subtitle="Some apply automatically, some you can opt into.">
        <Discounts catalog={catalog} quote={quote} toggleDiscount={toggleDiscount} members={members} />
      </Section>

      <Section n={9} title="Hospital network" subtitle="Cashless treatment at network hospitals across India.">
        <HospitalNetwork />
      </Section>
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

  const mobileValid = (v) => /^[6-9]\d{9}$/.test(v);
  const nameValid = (v) => v.trim().length >= 2;
  const emailValid = (v) => /^\S+@\S+\.\S+$/.test(v);

  return (
    <div style={{ maxWidth: 640 }}>
      <h2>Your details</h2>
      <p className="qsub">We'll verify your mobile number with a one-time password.</p>

      <label>Mobile number</label>
      <div className="otprow">
        <input
          inputMode="numeric" placeholder="10-digit mobile" maxLength={10} style={{ maxWidth: 220 }}
          value={otp.mobile} disabled={otp.verified} data-tour="mobile"
          className={otp.verified ? 'f-valid' : fieldClass(otp.mobile, (v) => v.length === 10, mobileValid)}
          onChange={(e) => setOtp({ ...otp, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
        />
        {!otp.verified && <button className="btn" onClick={sendOtp} data-tour="send-otp">{otp.sent ? 'Resend OTP' : 'Send OTP'}</button>}
        {otp.verified && <span className="verified">✓ Verified</span>}
      </div>
      {otp.error && <p className="error">{otp.error}</p>}
      {otp.sent && !otp.verified && <p className="hint">Verifying…</p>}

      <div className="formgrid" style={{ marginTop: 8 }}>
        <div>
          <label>Full name</label>
          <input value={proposer.name || ''} onChange={(e) => setP('name', e.target.value)} data-tour="proposer-name" className={fieldClass(proposer.name || '', (v) => v.trim().length >= 1, nameValid)} />
        </div>
        <div>
          <label>Email</label>
          <input value={proposer.email || ''} onChange={(e) => setP('email', e.target.value)} data-tour="proposer-email" className={fieldClass(proposer.email || '', (v) => v.length > 5, emailValid)} />
          {proposer.email && proposer.email.length > 5 && (emailValid(proposer.email)
            ? <span className="fieldok">✓</span>
            : <span className="fieldbad">✕ Check this email</span>)}
        </div>
        <div>
          <label>PAN <span className="hint" style={{ display: 'inline', marginTop: 0 }}>(optional)</span></label>
          <input value={proposer.pan || ''} onChange={(e) => setP('pan', e.target.value.toUpperCase().slice(0, 10))} className={fieldClass(proposer.pan || '', (v) => v.length === 10, isPanFormat)} />
          {(proposer.pan || '').length === 10 && (isPanFormat(proposer.pan)
            ? <span className="fieldok">✓</span>
            : <span className="fieldbad">✕ Format looks off</span>)}
        </div>
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
  if (!form) return <p className="hint">Loading your proposal…</p>;
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
        <p><b>{form.cover.plan_label} plan</b> · {siLabel(form.cover.sum_insured)} sum insured · {form.cover.tenure_years} year(s) · Add-ons: {form.cover.addons.length ? form.cover.addons.map((a) => a.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())).join(', ') : 'none'}</p>
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
          The actual product is what sits on top: <b>Feasly</b>, a PM workspace that reads this
          system's <b>source code</b> to tell a product manager whether a change is feasible —
          with file-and-line evidence.
        </p>
        <a className="btn gold" href="/ai?from=journey" data-tour="ai-handoff">Open the Feasly workspace →</a>
      </div>
    </div>
  );
}
