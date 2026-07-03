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

// ---- DOB text-entry helpers (dd/mm/yyyy with auto-inserted slashes) ----

// Format raw keystrokes into dd/mm/yyyy progressively.
export function formatDobInput(raw) {
  const d = String(raw).replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

// dd/mm/yyyy -> ISO yyyy-mm-dd, or null if not a real past date.
export function dobToIso(display) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display || '');
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getUTCDate() !== Number(dd) || date.getUTCMonth() + 1 !== Number(mm)) return null;
  if (date.getTime() > Date.now()) return null;
  if (Number(yyyy) < 1900) return null;
  return `${yyyy}-${mm}-${dd}`;
}

export const isoToDobDisplay = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};

export const ageFromIso = (iso) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 31557600000) : null;
