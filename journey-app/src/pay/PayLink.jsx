// Payment page — opened by customer directly (D2C) or via agent-sent link.
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { core, inr } from '../lib/api';
import { SuccessScreen } from '../journey/steps';

export default function PayLink() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { core.payment(token).then(setInfo).catch(e => setErr(e.message)); }, [token]);

  const pay = async () => {
    setBusy(true); setErr('');
    try {
      const r = await core.confirmPayment(token);  // simulated PG success callback into core
      setResult(r);                                // core confirms: proposal ISSUED + policy number
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  if (result) return <div className="page narrow"><SuccessScreen policyNo={result.policy_no} proposalId={result.proposal_id} /></div>;

  return (
    <div className="page narrow">
      <h2>Secure payment (simulated)</h2>
      {err && <p className="error">{err}</p>}
      {info && (
        <div className="paycard">
          <p className="hint">Proposal {info.proposal_id} · {info.summary.members} member(s) · {inr(info.summary.sum_insured)} SI · {info.summary.tenure_years} yr</p>
          <p>Paying as <b>{info.summary.proposer || 'customer'}</b></p>
          <p className="bigpremium">{inr(info.amount)}</p>
          {info.status === 'ACTIVE'
            ? <button className="btn" disabled={busy} onClick={pay}>{busy ? 'Processing…' : `Pay ${inr(info.amount)}`}</button>
            : <p className="error">This payment link has already been used.</p>}
          <p className="hint">Demo gateway — clicking Pay simulates a successful PG callback to core-policy-system.</p>
        </div>
      )}
    </div>
  );
}
