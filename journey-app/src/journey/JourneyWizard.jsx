// Issuance wizard — three steps: Get a quote → Your details → Review & pay.
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { core, inr } from '../lib/api';
import { validateProposer, validateNominee, validatePincode, dobToIso } from '../lib/validation';
import { QuoteStep, DetailsStep, ReviewStep } from './steps';
import { downloadProposalPdf } from '../lib/pdf';
import { track } from '../lib/track';

const STEPS = ['Get a quote', 'Your details', 'Review & pay'];

// Demo autofill values — one click fills whatever the current step needs.
const DEMO_DOB = { SELF: '15/06/1995', SPOUSE: '22/08/1996', FATHER: '02/01/1962', MOTHER: '10/04/1965', SON: '05/09/2016', DAUGHTER: '20/11/2018' };

export default function JourneyWizard() {
  const nav = useNavigate();
  const [catalog, setCatalog] = useState(null);
  const [step, setStep] = useState(0);
  const [members, setMembers] = useState([{ relationship: 'SELF', dob: '', dobText: '', ped: null, declarations: {} }]);
  const [pincode, setPincode] = useState('');
  // Defaults: Unlimited sum insured + 5-year tenure pre-selected.
  const [quote, setQuote] = useState({ sum_insured: 99999999, tenure_years: 5, plan: 'APEX', addons: null, discounts: [] });
  const [showBreak, setShowBreak] = useState(false);
  const [planQuotes, setPlanQuotes] = useState(null);
  const [proposer, setProposer] = useState({});
  const [nominee, setNominee] = useState(null);
  const [otp, setOtp] = useState({ mobile: '', sent: false, code: '', verified: false, error: '' });
  const [proposalId, setProposalId] = useState(null);
  const [premium, setPremium] = useState(null);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState('');

  // Funnel instrumentation: one step-view per wizard step per session, plus
  // the payment handoff. Clicks are captured on the wizard root below.
  useEffect(() => { track('step', STEPS[step]); }, [step]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { core.catalog().then(setCatalog).catch((e) => setErr(e.message)); }, []);

  // Seed the default plan's bundled add-ons once the catalog arrives.
  useEffect(() => {
    if (!catalog || quote.addons !== null) return;
    const v = (catalog.plan_variants || []).find((x) => x.code === quote.plan);
    setQuote((q) => ({ ...q, addons: v ? [...v.included_addons] : [] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);

  // Picking a tier adopts its bundle; customization then edits from there.
  const selectPlan = (code) => {
    const v = (catalog?.plan_variants || []).find((x) => x.code === code);
    setQuote((q) => ({ ...q, plan: code, addons: v ? [...v.included_addons] : [] }));
  };
  const toggleDiscount = (code) => setQuote((q) => ({
    ...q,
    discounts: (q.discounts || []).includes(code) ? q.discounts.filter((d) => d !== code) : [...(q.discounts || []), code]
  }));

  // Selected plan's colour drives the journey's secondary accent.
  const planColor = (catalog?.plan_variants || []).find((v) => v.code === quote.plan)?.color;

  // One-click demo data for whatever the current step needs.
  const fillDemo = () => {
    if (step === 0) {
      setPincode('400001');
      setMembers((ms) => ms.map((m) => {
        const dobText = m.dobText?.length === 10 ? m.dobText : DEMO_DOB[m.relationship] || '15/06/1995';
        const declarations = Object.fromEntries((catalog?.medical_questions || []).map((q) => [q.code, false]));
        return { ...m, dobText, dob: dobToIso(dobText) || '', ped: false, declarations, ped_declared: false };
      }));
    }
    if (step === 1) {
      setOtp({ mobile: '9876543210', sent: true, code: '4 8 2 9 1 6', verified: true, error: '' });
      setProposer({ name: 'Arjun Mehta', email: 'arjun.mehta@example.com', pan: 'ABCPM1234K' });
      setNominee({ name: 'Priya Mehta', relation: 'Spouse', dob: '1996-04-12' });
    }
  };

  // Everything the rating engine needs before it can price this proposal.
  const quoteReady =
    members.length > 0 &&
    members.every((m) => m.dob) &&
    validatePincode(pincode) &&
    members.every((m) =>
      m.ped === false ||
      (m.ped === true && (catalog?.medical_questions || []).every((q) => m.declarations[q.code] !== undefined)));

  const apiMembers = () => members.map((m) => ({
    relationship: m.relationship, dob: m.dob, declarations: m.declarations, ped_declared: !!m.ped_declared
  }));

  // Live premium: debounce re-rating as the customer configures the quote.
  const syncTimer = useRef(null);
  const proposalRef = useRef(null);
  proposalRef.current = proposalId;
  useEffect(() => {
    if (step !== 0 || !quoteReady || quote.addons === null) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      setBusy(true); setErr('');
      try {
        const body = {
          channel: 'D2C',
          pincode, members: apiMembers(), plan: quote.plan,
          sum_insured: quote.sum_insured, tenure_years: quote.tenure_years,
          addons: quote.addons, discounts: quote.discounts || []
        };
        const id = proposalRef.current;
        const p = id ? await core.updateProposal(id, body) : await core.createProposal(body);
        setProposalId(p.proposal_id);
        setPremium(p.premium);
      } catch (e) { setErr(e.message); }
      setBusy(false);
    }, 450);
    return () => clearTimeout(syncTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, quoteReady, JSON.stringify(members), pincode, JSON.stringify(quote)]);

  // Plan-card pricing: rate every tier for the current configuration.
  const planTimer = useRef(null);
  useEffect(() => {
    if (step !== 0 || !quoteReady) { return; }
    clearTimeout(planTimer.current);
    planTimer.current = setTimeout(async () => {
      try {
        const r = await core.quotePlans({
          pincode, members: apiMembers(), sum_insured: quote.sum_insured,
          tenure_years: quote.tenure_years, discounts: quote.discounts || []
        });
        setPlanQuotes(r);
      } catch { /* cards fall back to unpriced state */ }
    }, 450);
    return () => clearTimeout(planTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, quoteReady, JSON.stringify(members), pincode, quote.sum_insured, quote.tenure_years, (quote.discounts || []).join()]);

  const quoteGate = () => {
    if (!members.length) return 'Select at least one member to insure';
    if (members.some((m) => !m.dob)) return 'Enter a valid date of birth for every member';
    if (!validatePincode(pincode)) return 'Enter a valid 6-digit pincode';
    if (members.some((m) => m.ped === null)) return 'Answer the pre-existing disease question for every member';
    if (members.some((m) => m.ped === true && (catalog?.medical_questions || []).some((q) => m.declarations[q.code] === undefined)))
      return 'Answer all medical questions for members with declared conditions';
    if (!premium) return 'One moment — your premium is still being calculated';
    return null;
  };

  const next = async () => {
    setErr('');
    if (step === 0) {
      const gate = quoteGate();
      if (gate) return setErr(gate);
    }
    if (step === 1) {
      if (!otp.verified) return setErr('Verify your mobile number first');
      const fullProposer = { ...proposer, mobile: otp.mobile };
      const errs = [...validateProposer(fullProposer), ...validateNominee(nominee)];
      if (errs.length) return setErr(errs[0]);
      setBusy(true);
      try {
        await core.updateProposal(proposalId, { proposer: fullProposer, nominee });
        setForm(await core.proposalForm(proposalId));   // core renders the proposal form for review
      } catch (e) { setBusy(false); return setErr(e.message); }
      setBusy(false);
    }
    if (step === 2) {
      setBusy(true);
      try {
        await core.submitProposal(proposalId);           // DRAFT -> SUBMITTED
        const link = await core.paymentLink(proposalId); // core issues payment link/token
        track('step', 'Payment');
        nav(`/pay/${link.token}`);
        return;
      } catch (e) { setBusy(false); return setErr(e.message); }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  return (
    <div className="wizard" style={planColor ? { '--accent2': planColor } : undefined}
      onClickCapture={(e) => { const b = e.target.closest?.('button'); if (b?.textContent?.trim()) track('click', b.textContent.trim().slice(0, 60)); }}>
      <div className="stepper">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            {i > 0 && <span className="sep">›</span>}
            <button
              className={'crumb ' + (i === step ? 'cur' : i < step ? 'done' : '')}
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
            >
              <span className="dot">{i < step ? '✓' : i + 1}</span> {s}
            </button>
          </React.Fragment>
        ))}
        {step < 2 && (
          <button className="demofill" onClick={fillDemo}>⚡ Fill demo data</button>
        )}
      </div>

      <div className="stepbody">
        {step === 0 && (
          <QuoteStep
            catalog={catalog} members={members} setMembers={setMembers}
            pincode={pincode} setPincode={setPincode}
            quote={quote} setQuote={setQuote}
            planQuotes={planQuotes} onSelectPlan={selectPlan} toggleDiscount={toggleDiscount}
          />
        )}
        {step === 1 && (
          <DetailsStep
            proposer={proposer} setProposer={setProposer}
            nominee={nominee} setNominee={setNominee}
            otp={otp} setOtp={setOtp}
          />
        )}
        {step === 2 && <ReviewStep form={form} onDownloadPdf={() => downloadProposalPdf(form)} />}
      </div>

      {err && <p className="error">{err}</p>}
      {step > 0 && (
        <div className="navrow">
          <button className="btn ghost" onClick={() => setStep((s) => s - 1)}>← Back</button>
        </div>
      )}

      {/* Persistent premium bar — premium + primary CTA, on screen at all times. */}
      <div className="stickybar">
        {premium ? (
          <button className="baramount" onClick={() => setShowBreak((v) => !v)}>
            <span className="lbl">Total premium · {quote.tenure_years} yr {showBreak ? '▾' : '▴'}</span>
            <span className="amt">{inr(premium.total)}</span>
          </button>
        ) : (
          <span className="baramount"><span className="lbl">Your premium</span><span className="barhint">Complete steps 1–4 above</span></span>
        )}
        {showBreak && premium && (
          <div className="breakdown">
            <div className="prow"><span>Base premium</span><b>{inr(premium.base)}</b></div>
            <div className="prow"><span>Add-ons</span><b>{inr(premium.addons)}</b></div>
            <div className="prow"><span>Loadings</span><b>{inr(premium.loadings)}</b></div>
            <div className="prow"><span>Discounts</span><b>−{inr(premium.discounts)}</b></div>
            <div className="prow"><span>GST (18%)</span><b>{inr(premium.gst)}</b></div>
            <div className="prow total"><span>Total · {quote.tenure_years} yr</span><b>{inr(premium.total)}</b></div>
          </div>
        )}
        <button className="btn bar-cta" disabled={busy} onClick={next}>
          {busy ? 'Working…' : step === 2 ? 'Proceed to pay' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
