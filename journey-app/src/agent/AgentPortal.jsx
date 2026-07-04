// Agent portal — login, dashboard of proposals, new proposal on behalf of customer.
import React, { useState, useEffect } from 'react';
import { core, inr } from '../lib/api';
import JourneyWizard from '../journey/JourneyWizard';

const AGENTS = { agent: { password: 'agent@123', code: 'AGT-7001', name: 'Demo Agent' } };

export default function AgentPortal() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dash');
  if (!user) return <Login onLogin={setUser} />;
  return (
    <div className={'page' + (view === 'new' ? ' page-wide' : '')}>
      <div className="portalbar">
        <span><b>Agent portal</b> · {user.name} ({user.code})</span>
        <span>
          <button className={'tabbtn ' + (view === 'dash' ? 'on' : '')} onClick={() => setView('dash')}>My proposals</button>
          <button className={'tabbtn ' + (view === 'new' ? 'on' : '')} onClick={() => setView('new')}>New proposal</button>
          <button className="tabbtn" onClick={() => setUser(null)}>Logout</button>
        </span>
      </div>
      {view === 'dash' ? <Dashboard agentCode={user.code} /> : <JourneyWizard mode="agent" agentCode={user.code} />}
    </div>
  );
}

function Login({ onLogin }) {
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState('');
  const go = () => {
    const a = AGENTS[u];
    if (a && a.password === p) onLogin(a);
    else setErr('Invalid credentials. Demo login: agent / agent@123');
  };
  return (
    <div className="page narrow">
      <h2>Agent login</h2>
      <label>Agent ID</label><input value={u} onChange={e => setU(e.target.value)} />
      <label>Password</label><input type="password" value={p} onChange={e => setP(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} />
      {err && <p className="error">{err}</p>}
      <button className="btn" onClick={go}>Login</button>
      <p className="hint">Demo credentials: <code>agent / agent@123</code></p>
    </div>
  );
}

function Dashboard({ agentCode }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    const load = () => core.listProposals(agentCode).then(setRows).catch(() => {});
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [agentCode]);
  if (!rows.length) return <p className="hint">No proposals yet — create one for a customer via “New proposal”.</p>;
  return (
    <table className="dashtable">
      <thead><tr><th>Proposal</th><th>Members</th><th>SI</th><th>Premium</th><th>Status</th><th>Policy no</th></tr></thead>
      <tbody>
        {rows.map(p => (
          <tr key={p.proposal_id}>
            <td>{p.proposal_id}</td><td>{p.members.length}</td><td>{inr(p.sum_insured)}</td>
            <td>{inr(p.premium?.total)}</td>
            <td><span className={'status ' + p.status.toLowerCase()}>{p.status}</span></td>
            <td>{p.policy_no || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
