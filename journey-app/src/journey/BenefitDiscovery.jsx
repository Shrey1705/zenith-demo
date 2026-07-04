// Policy discovery — every benefit as a collapsible tile, base and optional
// side by side. Icons + a one-line hook when collapsed; the real detail
// (and, for optional covers, the Add button) only on expand.
import React, { useState } from 'react';
import { inr } from '../lib/api';

const OPTIONAL_META = {
  BONUS_ACCELERATOR:   { icon: '📈', tagline: 'I remember every claim-free year.' },
  LIMITLESS_SHIELD:     { icon: '♾️', tagline: 'One claim, no ceiling.' },
  EARLY_COVER:          { icon: '⏳', tagline: 'Less waiting, more covering.' },
  OPD_CARE:             { icon: '🩹', tagline: 'Doctor visits, sorted.' },
  COVER_ESCALATOR:      { icon: '📊', tagline: 'Inflation-proofed, automatically.' },
  ROOM_FLEX:            { icon: '🛏️', tagline: 'Any room, no penalty.' },
  CONSUMABLES_COVER:    { icon: '🧴', tagline: 'The small stuff, covered too.' },
  PRIORITY_MEMBERSHIP:  { icon: '👑', tagline: 'Skip the queue, always.' },
  ANNUAL_HEALTH_CHECK:  { icon: '🩻', tagline: 'A check-up, on me. Every year.' },
  NON_PAYABLES_COVER:   { icon: '🧾', tagline: 'No more surprise line items.' },
  DAILY_HOSPITAL_CASH:  { icon: '💰', tagline: 'Cash for every day you’re in.' },
  GLOBAL_ACCESS:        { icon: '✈️', tagline: 'Borders don’t limit your care.' },
  ACCIDENT_SHIELD:      { icon: '🛡️', tagline: 'One bad day, still protected.' },
  WELLNESS_COMPANION:   { icon: '🧘', tagline: 'Your mind and body, coached.' }
};
const OPTIONAL_DESC = {
  BONUS_ACCELERATOR: 'Every claim-free year grows your cover — up to 100% extra sum insured.',
  LIMITLESS_SHIELD: 'Once in a lifetime, one claim with no upper limit — for the catastrophic event.',
  EARLY_COVER: 'Cuts the waiting period for pre-existing diseases from 36 months to just 12.',
  OPD_CARE: 'Doctor consultations, diagnostics and teleconsults covered — cashless.',
  COVER_ESCALATOR: 'Your sum insured rises automatically every year to keep pace with inflation.',
  ROOM_FLEX: 'Pick any hospital room category — no rent caps, no proportional deductions.',
  CONSUMABLES_COVER: 'Pays for gloves, syringes and other non-medical items bills usually exclude.',
  PRIORITY_MEMBERSHIP: 'Dedicated support and priority claims processing whenever you need us.',
  ANNUAL_HEALTH_CHECK: 'A full-body health check-up, cashless, every single year.',
  NON_PAYABLES_COVER: 'Pays for the bill items most policies quietly exclude — gloves, kits, disposables.',
  DAILY_HOSPITAL_CASH: 'A fixed payout for every day you’re admitted — spend it however you need.',
  GLOBAL_ACCESS: 'Planned or emergency treatment anywhere in the world.',
  ACCIDENT_SHIELD: 'A lump sum payout for accidental death or disability.',
  WELLNESS_COMPANION: 'Mental health support, nutrition and fitness coaching, on demand.'
};

const addonPrice = (a) => (a.flat ? `+${inr(a.flat)}/yr` : `+${a.pct}% of base`);

export default function BenefitDiscovery({ catalog, quote, toggleAddon, selectedVariant }) {
  const [open, setOpen] = useState(() => new Set());
  const flip = (code) => setOpen((s) => {
    const n = new Set(s);
    n.has(code) ? n.delete(code) : n.add(code);
    return n;
  });
  const base = catalog?.common_benefits || [];
  const optional = catalog?.addons || [];
  const included = selectedVariant?.included_addons || [];

  return (
    <section className="discovery">
      <h3 className="disc-h">Every plan includes — and what you can add</h3>
      <p className="hint">Tap a tile to see what it covers.</p>
      <div className="tilegrid">
        {base.map((b) => {
          const isOpen = open.has(b.code);
          return (
            <div className={'tile base' + (isOpen ? ' open' : '')} key={b.code}>
              <button className="tilehead" onClick={() => flip(b.code)}>
                <span className="tileicon">{b.icon}</span>
                <span className="tiletext"><b>{b.label}</b><small>{b.tagline}</small></span>
                <span className="tilebadge base">BASE</span>
              </button>
              {isOpen && <p className="tilebody">{b.description}</p>}
            </div>
          );
        })}
        {optional.map((a) => {
          const isOpen = open.has(a.code);
          const on = (quote.addons || []).includes(a.code);
          const bundled = included.includes(a.code);
          const meta = OPTIONAL_META[a.code] || {};
          return (
            <div className={'tile optional' + (isOpen ? ' open' : '') + (on ? ' added' : '')} key={a.code}>
              <button className="tilehead" onClick={() => flip(a.code)}>
                <span className="tileicon">{meta.icon || '➕'}</span>
                <span className="tiletext"><b>{a.label.split(' (')[0]}</b><small>{meta.tagline}</small></span>
                <span className={'tilebadge ' + (bundled ? 'included' : 'optional')}>{bundled ? 'INCLUDED' : addonPrice(a)}</span>
              </button>
              {isOpen && (
                <div className="tilebody">
                  <p>{OPTIONAL_DESC[a.code] || a.label}</p>
                  {bundled
                    ? <p className="hint">Already in your {selectedVariant.label} plan.</p>
                    : <button className={'addbtn ' + (on ? 'on' : '')} onClick={() => toggleAddon(a.code)}>{on ? 'Added ✓' : 'Add to plan'}</button>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
