// Shared issuance wizard — used by BOTH the customer journey (D2C) and the
// agent portal (channel AGENT). One journey, two channels, same core APIs.
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { core } from '../lib/api';
import { validateMember, validateProposer, validateNominee, validatePincode } from '../lib/validation';
import { MembersStep, DetailsStep, MedicalStep, QuoteStep, ProposerStep, ReviewStep } from './steps';

const STEPS = ['Members', 'Details', 'Medical', 'Quote', 'Proposer', 'Review', 'Payment'];

export default function JourneyWizard({ mode = 'customer', agentCode = null, onLinkCreated = null }) {
  const nav = useNavigate();
  const [catalog, setCatalog] = useState(null);
  const [step, setStep] = useState(0);
  const [members, setMembers] = useState([{ relationship: 'SELF', dob: '', declarations: {} }]);
  const [pincode, setPincode] = useState('');
  const [quote, setQuote] = useState({ sum_insured: 1000000, tenure_years: 1, addons: [] });
  const [proposer, setProposer] = useState({});
  const [nominee, setNominee] = useState(null);
  const [nomineeSkipped, setNomineeSkipped] = useState(false);
  const [proposalId, setProposalId] = useState(null);
  const [premium, setPremium] = useState(null);
  const [form, setForm] = useState(null);
  const [payLink, setPayLink] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { core.catalog().then(setCatalog).catch(e => setErr(e.message)); }, []);

  // Create draft on entering Quote; re-rate via PUT on any quote change
  const syncProposal = useCallback(async (q) => {
    setBusy(true); setErr('');
    try {
      const body = {
        channel: mode === 'agent' ? 'AGENT' : 'D2C', agent_code: agentCode,
        pincode, members, sum_insured: q.sum_insured, tenure_years: q.tenure_years, addons: q.addons
      };
      const p = proposalId ? await core.updateProposal(proposalId, body) : await core.createProposal(body);
      setProposalId(p.proposal_id);
      setPremium(p.premium);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }, [proposalId, pincode, members, mode, agentCode]);

  useEffect(() => { if (step === 3) syncProposal(quote); /* eslint-disable-line */ }, [step, quote]);

  const next = async () => {
    setErr('');
    if (step === 0) {
      if (!members.length) return setErr('Select at least one member');
      if (!validatePincode(pincode)) return setErr('Enter a valid 6-digit pincode');
    }
    if (step === 1) {
      const errs = members.flatMap(validateMember);
      if (errs.length) return setErr(errs[0]);
    }
    if (step === 2) {
      const unanswered = members.some(m => (catalog?.medical_questions || []).some(q => m.declarations[q.code] === undefined));
      if (unanswered) return setErr('Please answer all declarations for every member');
    }
    if (step === 4) {
      const errs = [...validateProposer(proposer), ...validateNominee(nominee)];
      if (errs.length) return setErr(errs[0]);
      setBusy(true);
      try {
        await core.updateProposal(proposalId, { proposer, nominee });
        const f = await core.proposalForm(proposalId);   // core renders the proposal form for review
        setForm(f);
      } catch (e) { setBusy(false); return setErr(e.message); }
      setBusy(false);
    }
    if (step === 5) {
      setBusy(true);
      try {
        await core.submitProposal(proposalId);           // DRAFT -> SUBMITTED
        const link = await core.paymentLink(proposalId); // core issues payment link/token
        setPayLink(link);
        if (mode === 'agent' && onLinkCreated) onLinkCreated(proposalId, link);
      } catch (e) { setBusy(false); return setErr(e.message); }
      setBusy(false);
    }
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  return (
    <div className="wizard">
      <div className="steps">
        {STEPS.map((s, i) => <span key={s} className={'stepdot ' + (i === step ? 'cur' : i < step ? 'done' : '')}>{s}</span>)}
      </div>
      <div className="stepbody">
        {step === 0 && <MembersStep catalog={catalog} members={members} setMembers={setMembers} pincode={pincode} setPincode={setPincode} />}
        {step === 1 && <DetailsStep members={members} setMembers={setMembers} />}
        {step === 2 && <MedicalStep catalog={catalog} members={members} setMembers={setMembers} />}
        {step === 3 && <QuoteStep catalog={catalog} quote={quote} setQuote={setQuote} premium={premium} busy={busy} />}
        {step === 4 && <ProposerStep proposer={proposer} setProposer={setProposer} nominee={nominee} setNominee={setNominee} nomineeSkipped={nomineeSkipped} setNomineeSkipped={setNomineeSkipped} />}
        {step === 5 && <ReviewStep form={form} />}
        {step === 6 && (mode === 'customer'
          ? <CustomerPay payLink={payLink} nav={nav} />
          : <AgentSendLink payLink={payLink} proposalId={proposalId} />)}
      </div>
      {err && <p className="error">{err}</p>}
      {step < 6 && (
        <div className="navrow">
          {step > 0 && <button className="btn ghost" onClick={() => setStep(s => s - 1)}>Back</button>}
          <button className="btn" disabled={busy} onClick={next}>
            {busy ? 'Working…' : step === 5 ? (mode === 'agent' ? 'Submit & create payment link' : 'Confirm & proceed to pay') : 'Continue'}
          </button>
        </div>
      )}
    </div>
  );
}

function CustomerPay({ payLink, nav }) {
  useEffect(() => { if (payLink) nav(`/pay/${payLink.token}`); }, [payLink, nav]);
  return <p className="hint">Redirecting to secure payment…</p>;
}

function AgentSendLink({ payLink, proposalId }) {
  const [status, setStatus] = useState('SUBMITTED');
  const [policyNo, setPolicyNo] = useState(null);
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
  const url = payLink ? `${window.location.origin}/pay/${payLink.token}` : '';
  return (
    <div>
      <h2>Payment link created</h2>
      <p className="hint">Share this link with the customer. In production this goes by SMS/email; for the demo, open it in a new tab to play the customer.</p>
      <div className="linkbox">
        <code>{url}</code>
        <button className="btn ghost" onClick={() => navigator.clipboard.writeText(url)}>Copy</button>
        <a className="btn" href={url} target="_blank" rel="noreferrer">Open as customer ↗</a>
      </div>
      <p className="hint">Waiting for payment… status: <b>{status}</b> (auto-refreshing)</p>
    </div>
  );
}
