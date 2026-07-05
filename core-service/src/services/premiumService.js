// Premium engine — every number traces to src/rules/premium.rules.yaml
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const RULES = yaml.load(fs.readFileSync(path.join(__dirname, '../rules/premium.rules.yaml'), 'utf8'));
const UW = yaml.load(fs.readFileSync(path.join(__dirname, '../rules/underwriting.rules.yaml'), 'utf8'));

const age = (dob) => Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
const isAdult = (m) => age(m.dob) >= 18;

function zoneFor(pincode) {
  const d = String(pincode)[0];
  return (d === '1' || d === '4') ? 'ZONE_A' : (d === '2' || d === '3' || d === '5') ? 'ZONE_B' : 'ZONE_C';
}
function adultRate(a) {
  if (a <= 35) return RULES.age_band_rates_adult['18-35'];
  if (a <= 45) return RULES.age_band_rates_adult['36-45'];
  if (a <= 55) return RULES.age_band_rates_adult['46-55'];
  return RULES.age_band_rates_adult['56-65'];
}

function validate(p) {
  const errors = [];
  if (!RULES.tenure_options_years.includes(p.tenure_years)) errors.push(`tenure_years must be one of ${RULES.tenure_options_years}`);
  if (!UW.sum_insured_bands.includes(p.sum_insured)) errors.push(`sum_insured must be one of ${UW.sum_insured_bands}`);
  const rels = UW.permitted_relationships;
  for (const m of p.members || []) {
    if (!rels.includes(m.relationship)) errors.push(`relationship ${m.relationship} not permitted (allowed: ${rels})`);
    const a = age(m.dob);
    if (isAdult(m) && (a < UW.entry_age.adult.min_years || a > UW.entry_age.adult.max_years))
      errors.push(`adult entry age ${UW.entry_age.adult.min_years}-${UW.entry_age.adult.max_years} violated (got ${a})`);
  }
  const adults = (p.members || []).filter(isAdult).length;
  const children = (p.members || []).length - adults;
  if (adults > UW.max_adults) errors.push(`max ${UW.max_adults} adults`);
  if (children > UW.max_children) errors.push(`max ${UW.max_children} children`);
  for (const a of p.addons || []) if (!RULES.addons[a]) errors.push(`unknown addon ${a}`);
  for (const d of p.discounts || []) if (!RULES.optional_discounts[d]) errors.push(`unknown discount ${d}`);
  if (p.plan && !RULES.plan_variants[p.plan]) errors.push(`unknown plan ${p.plan} (allowed: ${Object.keys(RULES.plan_variants)})`);

  // Mutually exclusive optional benefits (e.g. Co-Payment vs Aggregate Deductible)
  const chosen = new Set(p.addons || []);
  for (const [a, b] of RULES.addon_conflicts || []) {
    if (chosen.has(a) && chosen.has(b)) errors.push(`${a} and ${b} cannot be opted together`);
  }
  // Payment-mode constraints (Initial Wait Modifier is annual-payment only)
  const freq = p.payment_frequency || 'ANNUAL';
  for (const [code, rule] of Object.entries(RULES.addon_payment_constraints || {})) {
    if (chosen.has(code) && (rule.blocked_payment_frequencies || []).includes(freq))
      errors.push(`${code} cannot be combined with ${freq} payment mode`);
  }
  return errors;
}

function calculate(p) {
  const siMult = RULES.sum_insured_multiplier[String(p.sum_insured)];
  const zone = zoneFor(p.pincode);
  const planMult = RULES.plan_variants[p.plan]?.rate_multiplier ?? 1;

  let base = 0;
  for (const m of p.members) base += (isAdult(m) ? adultRate(age(m.dob)) : RULES.child_rate);
  base = Math.round(base * siMult * RULES.zone_loading[zone] * planMult);

  let addons = 0;
  for (const code of p.addons || []) {
    const a = RULES.addons[code];
    addons += a.flat ? a.flat : Math.round(base * a.pct / 100);
  }

  const pedDeclared = p.members.some(m => m.ped_declared);
  const loadings = pedDeclared ? Math.round(base * UW.ped.loading_pct / 100) : 0;

  const n = p.members.length;
  const famPct = n >= 3 ? RULES.family_discount_pct['3_plus'] : n === 2 ? RULES.family_discount_pct['2'] : 0;
  let discounts = Math.round(base * famPct / 100);

  // Opt-in discounts (digital policy, auto-debit, …) apply on base + add-ons.
  let optPct = 0;
  for (const code of p.discounts || []) optPct += RULES.optional_discounts[code]?.pct || 0;
  discounts += Math.round((base + addons) * optPct / 100);

  let annual = base + addons + loadings - discounts;
  let total = annual * p.tenure_years;
  const tdPct = RULES.tenure_discount_pct[String(p.tenure_years)] || 0;
  const tenureDiscount = Math.round(total * tdPct / 100);
  discounts += tenureDiscount;
  total -= tenureDiscount;

  const gst = Math.round(total * RULES.gst_pct / 100);
  return { base, addons, loadings, discounts, gst, total: total + gst, zone, ped_loading_applied: pedDeclared };
}

module.exports = { validate, calculate, RULES, UW, age, isAdult };
