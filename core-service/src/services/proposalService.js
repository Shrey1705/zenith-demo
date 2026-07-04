// Proposal lifecycle: DRAFT -> SUBMITTED -> ISSUED
const store = require('../store');
const premium = require('./premiumService');

// Abuse guard for a public demo: bound the free-text fields that aren't
// already constrained by an enum/pattern in premium.validate().
const MAX_LEN = 200;
function lengthCapErrors(body) {
  const errors = [];
  if (body.pincode && String(body.pincode).length > 6) errors.push('pincode too long');
  const checkFields = (obj, fields, label) => {
    if (!obj) return;
    for (const f of fields) {
      if (obj[f] && String(obj[f]).length > MAX_LEN) errors.push(`${label}.${f} too long (max ${MAX_LEN} chars)`);
    }
  };
  checkFields(body.proposer, ['name', 'mobile', 'email', 'pan'], 'proposer');
  checkFields(body.nominee, ['name', 'relation'], 'nominee');
  return errors;
}

async function createProposal(body) {
  const capErrors = lengthCapErrors(body);
  if (capErrors.length) return { errors: capErrors };
  const errors = premium.validate(body);
  if (errors.length) return { errors };
  const p = {
    proposal_id: await store.newId('PRP'),
    channel: body.channel || 'D2C',
    agent_code: body.agent_code || null,
    status: 'DRAFT',
    payment_status: 'PENDING',
    policy_no: null,
    pincode: body.pincode,
    plan: body.plan || 'CORE',
    tenure_years: body.tenure_years,
    sum_insured: body.sum_insured,
    addons: body.addons || [],
    members: body.members,
    proposer: body.proposer || null,
    nominee: body.nominee || null,   // optional at proposal stage (underwriting.rules)
    created_at: new Date().toISOString()
  };
  p.premium = premium.calculate(p);
  return { proposal: await store.saveProposal(p) };
}

async function updateProposal(id, body) {
  const capErrors = lengthCapErrors(body);
  if (capErrors.length) return { errors: capErrors };
  const p = await store.getProposal(id);
  if (!p) return { errors: ['proposal not found'] };
  if (p.status !== 'DRAFT') return { errors: [`cannot update proposal in status ${p.status}`] };
  const merged = { ...p, ...body, proposal_id: p.proposal_id, status: 'DRAFT' };
  const errors = premium.validate(merged);
  if (errors.length) return { errors };
  merged.premium = premium.calculate(merged);
  return { proposal: await store.saveProposal(merged) };
}

async function submitProposal(id) {
  const p = await store.getProposal(id);
  if (!p) return { errors: ['proposal not found'] };
  if (!p.proposer || !p.proposer.name) return { errors: ['proposer details required before submit'] };
  p.status = 'SUBMITTED';
  return { proposal: await store.saveProposal(p) };
}

// Render-ready proposal form for the review screen (customer-facing)
async function proposalForm(id) {
  const p = await store.getProposal(id);
  if (!p) return null;
  const uw = premium.UW;
  return {
    proposal_id: p.proposal_id,
    product: 'Zenith Health Retail (demo)',
    status: p.status,
    proposer: p.proposer,
    members: p.members.map(m => ({
      relationship: m.relationship, dob: m.dob,
      age: premium.age(m.dob),
      ped_declared: !!m.ped_declared
      // NOTE: per-member PED waiting months intentionally not exposed in v2 (contract)
    })),
    cover: {
      plan: p.plan,
      plan_label: premium.RULES.plan_variants[p.plan]?.label || p.plan,
      sum_insured: p.sum_insured, tenure_years: p.tenure_years,
      addons: p.addons, pincode: p.pincode
    },
    nominee: p.nominee,   // may be null — optional at proposal stage
    premium: p.premium,
    declarations_note: `Initial waiting ${uw.waiting_periods.initial_days} days; PED waiting ${uw.waiting_periods.ped_months} months (or ${uw.waiting_periods.ped_months_with_early_cover} with Early Cover).`
  };
}

async function createPaymentLink(id) {
  const p = await store.getProposal(id);
  if (!p) return { errors: ['proposal not found'] };
  if (p.status === 'DRAFT') return { errors: ['submit proposal before payment'] };
  const link = await store.saveLink({
    token: await store.newId('PAY'),
    proposal_id: id,
    amount: p.premium.total,
    status: 'ACTIVE'
  });
  return { token: link.token, amount: link.amount, pay_url: `/pay/${link.token}` };
}

async function confirmPayment(token) {
  const link = await store.getLink(token);
  if (!link || link.status !== 'ACTIVE') return { errors: ['invalid or used payment link'] };
  const p = await store.getProposal(link.proposal_id);
  link.status = 'USED';
  p.payment_status = 'PAID';
  p.status = 'ISSUED';
  p.policy_no = 'POL/' + p.proposal_id.slice(3) + '/' + new Date().getFullYear();
  await store.saveLink(link);
  await store.saveProposal(p);
  return { proposal_id: p.proposal_id, policy_no: p.policy_no, status: p.status };
}

// Rate every plan tier for one configuration in a single call — powers the
// plan-selection cards. Each tier is priced as its bundle: tier multiplier on
// the base rate plus the tier's included add-ons. No proposal is persisted.
function quotePlans(body) {
  const errors = premium.validate({ ...body, plan: undefined, addons: [] });
  if (errors.length) return { errors };
  const plans = Object.entries(premium.RULES.plan_variants).map(([code, v]) => ({
    code,
    label: v.label,
    tagline: v.tagline,
    recommended: !!v.recommended,
    benefits: v.benefits,
    included_addons: v.included_addons,
    premium: premium.calculate({ ...body, plan: code, addons: v.included_addons })
  }));
  return { plans, common_benefits: premium.RULES.common_benefits };
}

module.exports = { createProposal, updateProposal, submitProposal, proposalForm, createPaymentLink, confirmPayment, quotePlans };
