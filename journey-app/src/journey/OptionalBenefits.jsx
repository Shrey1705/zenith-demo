// Optional benefits, categorised the way the storefront sells them:
// Must Haves / Cost Benefit / Cover Enhancer / Global Access / Wellness.
// Every card is the same size; adding a benefit modifies the selected plan.
import React, { useState } from 'react';
import { inr } from '../lib/api';

const priceOf = (a) => (a.flat ? `+${inr(a.flat)}/yr` : `+${a.pct}% of base`);

export default function OptionalBenefits({ catalog, quote, toggleAddon, selectedVariant }) {
  const cats = catalog?.addon_categories || [];
  const addons = catalog?.addons || [];
  const [cat, setCat] = useState(null);
  const active = cat || cats[0]?.code;
  const included = selectedVariant?.included_addons || [];
  const list = addons.filter((a) => a.category === active);

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
          const on = (quote.addons || []).includes(a.code);
          return (
            <div key={a.code} className={'benefitcard' + (on ? ' added' : '')}>
              <div className="benefithead">
                <span className="benefiticon">{a.icon}</span>
                <span className={'benefitprice' + (bundled ? ' incl' : '')}>{bundled ? 'INCLUDED' : priceOf(a)}</span>
              </div>
              <b>{a.label}</b>
              <small>{a.tagline}</small>
              <p>{a.description}</p>
              {bundled
                ? <span className="benefitnote">Part of your {selectedVariant?.label} plan</span>
                : <button className={'addbtn ' + (on ? 'on' : '')} onClick={() => toggleAddon(a.code)}>{on ? 'Added ✓' : 'Add to plan'}</button>}
            </div>
          );
        })}
      </div>
    </>
  );
}
