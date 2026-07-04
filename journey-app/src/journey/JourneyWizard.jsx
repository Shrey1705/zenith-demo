// Shared issuance wizard — used by BOTH the customer journey (D2C) and the
// agent portal (channel AGENT). One journey, two channels, same core APIs.
// Three steps: Get a quote → Your details → Review & pay.
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { core, inr } from '../lib/api';
import { validateProposer, validateNominee, validatePincode } from '../lib/validation';
import { QuoteStep, DetailsStep, ReviewStep } from './steps';
import { downloadProposalPdf } from '../lib/pdf';

const STEPS = ['Get a quote', 'Your details', 'Review & pay'];

export default function JourneyWizard({ mode = 'customer', agentCode = null, onLinkCreated = null }) {
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
  const [nomineeSkipped, setNomineeSkipped] = useState(false);
  const [otp, setOtp] = useState({ mobile: '', sent: false, code: '', verified: false, error: '' });
  const [proposalId, setProposalId] = useState(null);
  const [premium, setPremium] = useState(null);
  const [form, setForm] = useState(null);
  const [payLink, setPayLink] = useState(null);
  const [err, setErr] = useState('');
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
          channel: mode === 'agent' ? 'AGENT' : 'D2C', agent_code: agentCode,
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
    if (members.some((m) => m.ped === null)) return 'Answer the medical history question for every member';
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
        if (mode === 'agent') {
          if (onLinkCreated) onLinkCreated(proposalId, link);
          setPayLink(link);
          setBusy(false);
          setStep(3);                                    // agent: wait-for-payment screen
          return;
        }
        nav(`/pay/${link.token}`);                       // customer: straight to payment
        return;
      } catch (e) { setBusy(false); return setErr(e.message); }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  return (
    <div className="wizard" style={planColor ? { '--accent2': planColor } : undefined}>
      {step < 3 && (
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
        </div>
      )}

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
            nomineeSkipped={nomineeSkipped} setNomineeSkipped={setNomineeSkipped}
            otp={otp} setOtp={setOtp}
          />
        )}
        {step === 2 && <ReviewStep form={form} onDownloadPdf={() => downloadProposalPdf(form)} />}
        {step === 3 && <AgentSendLink proposalId={proposalId} payLink={payLink} />}
      </div>

      {err && <p className="error">{err}</p>}
      {step > 0 && step < 3 && (
        <div className="navrow">
          <button className="btn ghost" onClick={() => setStep((s) => s - 1)}>← Back</button>
        </div>
      )}

      {/* Persistent premium bar — premium + primary CTA, on screen at all times. */}
      {step < 3 && (
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
          <button className="btn bar-cta" disabled={busy} onClick={next} data-tour="wizard-next">
            {busy ? 'Working…' : step === 2 ? (mode === 'agent' ? 'Submit & create payment link' : 'Proceed to pay') : 'Continue →'}
          </button>
        </div>
      )}
    </div>
  );
}

function AgentSendLink({ proposalId, payLink }) {
  const [status, setStatus] = useState('SUBMITTED');
  const [policyNo, setPolicyNo] = useState(null);
  const payUrl = payLink ? `${window.location.origin}/pay/${payLink.token}` : '';

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const p = await core.getProposal(proposalId);   // poll: core tells us when payment lands
        setStatus(p.status);
        if (p.status === 'ISSUED') { setPolicyNo(p.policy_no); clearInterval(t); }
      } catch { /* keep polling */ }
    }, 2500);
    return () => clearInterval(t);
  }, [proposalId]);

  if (policyNo) {
    return (
      <div className="success">
        <div className="bigtick">✓</div>
        <h2>Payment received — policy issued!</h2>
        <p className="policyno">{policyNo}</p>
        <p className="hint">Customer paid via payment link. Confirmation flowed core → journey via status poll.</p>
      </div>
    );
  }
  return (
    <div>
      <h2>Payment link created</h2>
      <p className="hint">Share this link with the customer. In production this goes by SMS/email; for the demo, open it in a new tab to play the customer.</p>
      <div className="linkbox">
        <code>{payUrl || '…'}</code>
        <button className="btn ghost" onClick={() => navigator.clipboard.writeText(payUrl)}>Copy</button>
        <a className="btn" href={payUrl} target="_blank" rel="noreferrer">Open as customer ↗</a>
      </div>
      <p className="hint">Waiting for payment… status: <b>{status}</b> (auto-refreshing)</p>
    </div>
  );
}
