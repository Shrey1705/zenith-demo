// Optional benefits, categorised the way the storefront sells them:
// Must Haves / Cost Benefit / Cover Enhancer / Global Access / Wellness.
// Every card is the same size; adding a benefit modifies the selected plan.
// Mutually exclusive pairs (from core rules) disable each other with a note.
import React, { useState } from 'react';
import { inr } from '../lib/api';

const priceOf = (a) => {
  if (a.flat) return `+${inr(a.flat)}/yr`;
  return a.pct < 0 ? `saves ${Math.abs(a.pct)}%` : `+${a.pct}% of base`;
};

export default function OptionalBenefits({ catalog, quote, toggleAddon, selectedVariant }) {
  const cats = catalog?.addon_categories || [];
  const addons = catalog?.addons || [];
  const conflicts = catalog?.addon_conflicts || [];
  const [cat, setCat] = useState(null);
  const active = cat || cats[0]?.code;
  const included = selectedVariant?.included_addons || [];
  const chosen = new Set([...(quote.addons || [])]);
  const list = addons.filter((a) => a.category === active);

  // The chosen add-on (if any) that blocks this one.
  const blockedBy = (code) => {
    for (const [a, b] of conflicts) {
      if (code === a && chosen.has(b)) return b;
      if (code === b && chosen.has(a)) return a;
    }
    return null;
  };
  const labelOf = (code) => addons.find((a) => a.code === code)?.label || code;

  return (
    <>
      <div className="catpills">
        {cats.map((c) => {
          const count = addons.filter((a) => a.category === c.code).length;
          return (
            <button key={c.code} className={'pill' + (active === c.code ? ' on' : '')} onClick={() => setCat(c.code)}>
              {c.icon} {c.label} <span className="pillcount">{count}</span>
            </button>
          );
        })}
      </div>
      <div className="addongrid">
        {list.map((a) => {
          const bundled = included.includes(a.code);
          const on = chosen.has(a.code);
          const blocker = !on && !bundled ? blockedBy(a.code) : null;
          return (
            <div key={a.code} className={'benefitcard' + (on ? ' added' : '') + (blocker ? ' blocked' : '')}>
              <div className="benefithead">
                <span className="benefiticon">{a.icon}</span>
                <span className={'benefitprice' + (bundled ? ' incl' : a.pct < 0 ? ' saves' : '')}>{bundled ? 'INCLUDED' : priceOf(a)}</span>
              </div>
              <b>{a.label}</b>
              <small>{a.tagline}</small>
              <p>{a.description}</p>
              {a.sub_benefits && (
                <ul className="subbenefits">
                  {a.sub_benefits.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              )}
              {bundled
                ? <span className="benefitnote">Part of your {selectedVariant?.label} plan</span>
                : blocker
                  ? <span className="benefitnote warn">Not combinable with {labelOf(blocker)}</span>
                  : <button className={'addbtn ' + (on ? 'on' : '')} onClick={() => toggleAddon(a.code)}>{on ? 'Added ✓' : 'Add to plan'}</button>}
            </div>
          );
        })}
      </div>
    </>
  );
}
