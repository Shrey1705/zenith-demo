// Feasly pricing — founding-period plans. Buttons flip from "Request access"
// (email) to live Stripe checkout the moment PAYMENT_LINKS gets a URL; see
// lib/pricing.js. Honest by design: seats really are limited by support
// capacity during the founding period.
import React from 'react';
import { Link } from 'react-router-dom';
import { PLANS, PAYMENT_LINKS, CONTACT_EMAIL } from './lib/pricing';

export default function PricingPage() {
  return (
    <div className="landing">
      <section className="hero">
        <h1>Own your product's memory.<br /><span className="accent">Founding-member pricing.</span></h1>
        <p>
          Feasly is an AI PM workspace where the AI runs on <b style={{ color: '#fff' }}>your own machine</b> —
          your research, specs and decisions stay private by architecture, not by policy.
          Founding prices are locked for life and limited to the first 10 seats.
        </p>
        <div className="herobtns">
          <Link className="btn ghost light" to="/ai">Try it free first →</Link>
        </div>
      </section>

      <div className="pricegrid">
        {PLANS.map((p) => {
          const link = PAYMENT_LINKS[p.id];
          const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Feasly — ${p.name}`)}&body=${encodeURIComponent('Hi Shrey, I\'d like to get started with the ' + p.name + ' plan.')}`;
          return (
            <div key={p.id} className={'pricecard' + (p.featured ? ' featured' : '')}>
              {p.featured && <span className="pricebadge">Most popular</span>}
              <h3>{p.name}</h3>
              <div className="priceamount"><b>{p.price}</b> <span>{p.per}</span></div>
              <p className="pricetag">{p.tagline}</p>
              <ul>
                {p.bullets.map((b) => <li key={b}>{b}</li>)}
              </ul>
              {p.cta === 'start'
                ? <Link className="btn gold" to="/ai">Start free →</Link>
                : link
                  ? <a className="btn gold" href={link}>Get started →</a>
                  : <a className="btn gold" href={mailto}>Request access →</a>}
            </div>
          );
        })}
      </div>

      <section className="landing-section">
        <h2>Why is there a "request access" step?</h2>
        <p>
          Feasly is in its founding period — every new member gets personally onboarded,
          which is also why seats are limited. Email lands directly with the founder;
          you'll typically hear back the same day with a pilot invite.
        </p>
      </section>

      <div className="howto">
        <h3>Try before you decide</h3>
        <ol>
          <li>Open the <Link to="/ai">Feasly workspace</Link> and explore the Zenith showcase demo — no account needed.</li>
          <li>Sign in with your email for a private workspace when you're ready.</li>
          <li>Two-week free pilot on any plan — if it doesn't stick, walk away.</li>
        </ol>
      </div>
    </div>
  );
}
