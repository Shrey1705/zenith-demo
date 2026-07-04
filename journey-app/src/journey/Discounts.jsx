// Discounts — same tile grid pattern as optional benefits. Two kinds:
// auto-applied (family size, long-term tenure — driven by rules the customer
// already chose) and opt-in (digital policy, auto-debit, loyalty).
import React from 'react';

export default function Discounts({ catalog, quote, toggleDiscount, members }) {
  const opts = catalog?.optional_discounts || [];
  const fam = catalog?.family_discount_pct || {};
  const famPct = members.length >= 3 ? fam['3_plus'] : members.length === 2 ? fam['2'] : 0;
  const tenurePct = (catalog?.tenure_discount_pct || {})[String(quote.tenure_years)] || 0;

  const auto = [
    { icon: '👨‍👩‍👧', label: 'Family discount', pct: famPct,
      note: famPct ? `Applied for ${members.length} members` : 'Add a family member to unlock' },
    { icon: '📆', label: 'Long-term discount', pct: tenurePct,
      note: tenurePct ? `Applied for your ${quote.tenure_years}-year policy` : 'Choose a 2+ year tenure to unlock' },
  ];

  return (
    <div className="discgrid">
      {auto.map((d) => (
        <div key={d.label} className={'disctile' + (d.pct ? ' active' : '')}>
          <div className="benefithead">
            <span className="benefiticon">{d.icon}</span>
            <span className={'benefitprice' + (d.pct ? ' incl' : '')}>{d.pct ? `−${d.pct}%` : '—'}</span>
          </div>
          <b>{d.label}</b>
          <small>{d.note}</small>
          {d.pct ? <span className="benefitnote">✓ Auto-applied</span> : null}
        </div>
      ))}
      {opts.map((d) => {
        const on = (quote.discounts || []).includes(d.code);
        return (
          <div key={d.code} className={'disctile' + (on ? ' active' : '')}>
            <div className="benefithead">
              <span className="benefiticon">{d.icon}</span>
              <span className={'benefitprice' + (on ? ' incl' : '')}>−{d.pct}%</span>
            </div>
            <b>{d.label} discount</b>
            <small>{d.description}</small>
            <button className={'addbtn ' + (on ? 'on' : '')} onClick={() => toggleDiscount(d.code)}>{on ? 'Applied ✓' : 'Apply'}</button>
          </div>
        );
      })}
    </div>
  );
}
