// Cashless hospital network lookup. Collapsed by default — the list expands
// only once the customer searches (pincode, city, area or name) or filters
// by state. Demo directory; production reads the provider-network API.
import React, { useState } from 'react';
import { HOSPITALS, HOSPITAL_STATES } from './hospitals';

const SHOW = 6;

export default function HospitalNetwork() {
  const [q, setQ] = useState('');
  const [state, setState] = useState('All');

  const searched = q.trim().length > 0 || state !== 'All';
  const filtered = HOSPITALS.filter((h) =>
    (state === 'All' || h.state === state) &&
    (!q.trim() || [h.name, h.city, h.area, h.pincode].join(' ').toLowerCase().includes(q.trim().toLowerCase()))
  );
  const shown = filtered.slice(0, SHOW);

  return (
    <>
      <div className="hosptools">
        <input
          placeholder="Search by pincode, city, area or hospital name"
          value={q} onChange={(e) => setQ(e.target.value)}
        />
        <select value={state} onChange={(e) => setState(e.target.value)}>
          <option value="All">All states</option>
          {HOSPITAL_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {!searched ? (
        <p className="hint">10,000+ cashless hospitals nationwide — search your pincode or city to see the ones near you.</p>
      ) : shown.length ? (
        <>
          <div className="hospgrid">
            {shown.map((h) => (
              <div key={h.name} className="hospcard">
                <div className="hosphead">
                  <b>{h.name}</b>
                  <span className="cashless">CASHLESS</span>
                </div>
                <small>{h.area}, {h.city}, {h.state} — {h.pincode}</small>
                <small>🛏 {h.beds} beds · ☎ {h.phone}</small>
              </div>
            ))}
          </div>
          <p className="hint">
            Showing {shown.length} of {filtered.length} matching hospitals · 10,000+ cashless hospitals nationwide
          </p>
        </>
      ) : (
        <p className="hint">No hospitals match your search — try a nearby city or clear the filters.</p>
      )}
    </>
  );
}
