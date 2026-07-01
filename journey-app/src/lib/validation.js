// Client-side validation.
// ⚠ ALLOWED_RELATIONSHIPS mirrors core underwriting.rules.yaml — known
// duplication tech-debt; keep in sync until catalog-driven validation ships.
export const ALLOWED_RELATIONSHIPS = ['SELF', 'SPOUSE', 'SON', 'DAUGHTER', 'FATHER', 'MOTHER'];

export function validateMember(m) {
  const errs = [];
  if (!ALLOWED_RELATIONSHIPS.includes(m.relationship)) errs.push('relationship not permitted');
  if (!m.dob) errs.push('date of birth required');
  return errs;
}

export function validateProposer(p) {
  const errs = [];
  if (!p.name?.trim()) errs.push('proposer name required');
  if (!/^[6-9]\d{9}$/.test(p.mobile || '')) errs.push('valid 10-digit mobile required');
  if (!/^\S+@\S+\.\S+$/.test(p.email || '')) errs.push('valid email required');
  return errs;
}

// Nominee is OPTIONAL at proposal stage (mirrors underwriting.rules.yaml
// nominee.required_at_proposal: false). null is valid.
export function validateNominee(n) {
  if (n == null) return [];
  const errs = [];
  if (!n.name?.trim()) errs.push('nominee name required');
  if (!n.relation?.trim()) errs.push('nominee relation required');
  return errs;
}

export const validatePincode = (p) => /^[1-9][0-9]{5}$/.test(p || '');
