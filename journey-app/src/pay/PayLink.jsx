// Payment page — opened by customer directly (D2C) or via agent-sent link.
// Styled like a real PG checkout (method rail + summary panel); the gateway
// itself is simulated — clicking Pay fires the PG success callback into core.
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { core, inr } from '../lib/api';
import { SuccessScreen } from '../journey/steps';

const METHODS = [
  { id: 'card', icon: '💳', label: 'Credit / Debit Card', enabled: true },
  { id: 'upi', icon: '📱', label: 'UPI', enabled: false },
  { id: 'netbanking', icon: '🏦', label: 'NetBanking', enabled: false },
  { id: 'wallet', icon: '👛', label: 'Wallets', enabled: false }
];

export default function PayLink() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { core.payment(token).then(setInfo).catch((e) => setErr(e.message)); }, [token]);

  const pay = async () => {
    setBusy(true); setErr('');
    try {
      const r = await core.confirmPayment(token);  // simulated PG success callback into core
      setResult(r);                                // core confirms: proposal ISSUED + policy number
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  if (result) return <div className="page"><SuccessScreen policyNo={result.policy_no} proposalId={result.proposal_id} /></div>;

  return (
    <div className="page">
      <h2 style={{ marginBottom: 6 }}>Secure checkout</h2>
      <p className="hint" style={{ marginBottom: 18 }}>Zenith demo gateway — no real money moves here. Clicking Pay simulates a successful PG callback to the core policy system.</p>
      {err && <p className="error">{err}</p>}
      {info && (
        <div className="gateway">
          <div className="gw-rail">
            {METHODS.map((m) => (
              <button key={m.id} className={'gw-method ' + (m.enabled ? 'on' : '')} disabled={!m.enabled}
                title={m.enabled ? '' : 'Not wired in this demo'}>
                <span>{m.icon}</span> {m.label}{!m.enabled && ' ·  demo'}
              </button>
            ))}
          </div>

          <div className="gw-main">
            <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 16 }}>Enter card details</h3>
            <p className="hint">Prefilled with a test card — any values work in the demo.</p>
            <label>Card number</label>
            <input defaultValue="4242 4242 4242 4242" style={{ maxWidth: 280, letterSpacing: 2 }} />
            <div style={{ display: 'flex', gap: 14 }}>
              <div><label>Expiry</label><input defaultValue="12/29" style={{ maxWidth: 90 }} /></div>
              <div><label>CVV</label><input defaultValue="123" type="password" style={{ maxWidth: 80 }} /></div>
            </div>
            {info.status === 'ACTIVE'
              ? <button className="btn gold" disabled={busy} onClick={pay} data-tour="pay-button">{busy ? 'Processing…' : `Pay ${inr(info.amount)}`}</button>
              : <p className="error">This payment link has already been used.</p>}
            <p className="securedby">🔒 Simulated gateway · Zenith demo · data resets periodically</p>
          </div>

          <div className="gw-side">
            <div className="gw-amount">{inr(info.amount)}</div>
            <h4 style={{ marginTop: 18 }}>Payment summary</h4>
            <div className="prow" style={{ color: 'var(--muted)' }}><span>Proposal</span><b style={{ color: 'var(--text)' }}>{info.proposal_id}</b></div>
            <div className="prow" style={{ color: 'var(--muted)' }}><span>Members</span><b style={{ color: 'var(--text)' }}>{info.summary.members}</b></div>
            <div className="prow" style={{ color: 'var(--muted)' }}><span>Sum insured</span><b style={{ color: 'var(--text)' }}>{inr(info.summary.sum_insured)}</b></div>
            <div className="prow" style={{ color: 'var(--muted)' }}><span>Tenure</span><b style={{ color: 'var(--text)' }}>{info.summary.tenure_years} yr</b></div>
            <div className="prow" style={{ color: 'var(--muted)' }}><span>Paying as</span><b style={{ color: 'var(--text)' }}>{info.summary.proposer || 'customer'}</b></div>
          </div>
        </div>
      )}
    </div>
  );
}
