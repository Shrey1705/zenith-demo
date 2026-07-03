// Auto-filled Zenith proposal form PDF, generated client-side at the review
// step. Mirrors the section structure of a real Indian health-retail proposal
// form (proposer → applicants → coverage selection → nomination → medical
// declarations → declaration), filled from the live journey data.
import { jsPDF } from 'jspdf';

const NAVY = [13, 36, 64];
const GOLD = [201, 151, 59];
const MUTED = [95, 108, 123];
const LIGHT = [244, 245, 247];
const PRODUCT_UIN = 'Product Name: Zenith Health Retail, Product UIN: ZNHLIP2026V010001 (demo)';

const REL_LABELS = { SELF: 'Self', SPOUSE: 'Spouse', SON: 'Son', DAUGHTER: 'Daughter', FATHER: 'Father', MOTHER: 'Mother' };
const inr = (n) => 'Rs. ' + Number(n || 0).toLocaleString('en-IN');

// Matches the five medical questions in core underwriting rules.
const MEDICAL_QUESTIONS = [
  { code: 'PED_DIABETES', text: 'Diabetes / high blood sugar?' },
  { code: 'PED_HYPERTENSION', text: 'Hypertension / high BP?' },
  { code: 'PED_CARDIAC', text: 'Any heart / cardiac condition?' },
  { code: 'PED_OTHER', text: 'Any other ongoing illness, surgery or hospitalisation in last 36 months?' },
  { code: 'LIFESTYLE_TOBACCO', text: 'Tobacco / smoking in any form?' }
];

export function downloadProposalPdf(form) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 44;                       // margin
  let y = 0;

  const footer = () => {
    doc.setFillColor(...NAVY);
    doc.rect(0, doc.internal.pageSize.getHeight() - 26, W, 26, 'F');
    doc.setTextColor(255, 255, 255).setFontSize(7.5).setFont('helvetica', 'normal');
    doc.text(PRODUCT_UIN, W / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  };
  const ensure = (need) => {
    if (y + need > doc.internal.pageSize.getHeight() - 46) { footer(); doc.addPage(); y = M; }
  };
  const sectionHead = (label) => {
    ensure(34);
    doc.setFillColor(...NAVY);
    doc.rect(M, y, W - 2 * M, 20, 'F');
    doc.setTextColor(255, 255, 255).setFontSize(10).setFont('helvetica', 'bold');
    doc.text(label, M + 8, y + 13.5);
    y += 30;
  };
  const field = (label, value, x, width) => {
    doc.setTextColor(...MUTED).setFontSize(7.5).setFont('helvetica', 'normal');
    doc.text(label.toUpperCase(), x, y);
    doc.setTextColor(30, 30, 30).setFontSize(10).setFont('helvetica', 'bold');
    doc.text(String(value ?? '—'), x, y + 13, { maxWidth: width });
    doc.setDrawColor(210, 214, 220);
    doc.line(x, y + 17, x + width - 12, y + 17);
  };
  const fieldRow = (fields) => {
    ensure(34);
    const usable = W - 2 * M;
    const colW = usable / fields.length;
    fields.forEach(([label, value], i) => field(label, value, M + i * colW, colW));
    y += 32;
  };

  // ---- Header ----
  doc.setFillColor(...NAVY).rect(0, 0, W, 78, 'F');
  doc.setTextColor(255, 255, 255).setFont('helvetica', 'bold').setFontSize(22);
  doc.text('Zenith', M, 36);
  doc.setTextColor(...GOLD).setFontSize(11).setFont('helvetica', 'normal');
  doc.text('Health Retail — Proposal Form', M, 54);
  doc.setTextColor(200, 210, 222).setFontSize(8);
  doc.text(`Proposal No: ${form.proposal_id}   ·   Date: ${new Date().toLocaleDateString('en-IN')}   ·   Portfolio demo — simulated document`, M, 68);
  y = 100;

  // ---- 1. Proposer details ----
  sectionHead('1. Proposer Details');
  fieldRow([['Full name', form.proposer?.name], ['Mobile', form.proposer?.mobile], ['Email', form.proposer?.email]]);
  fieldRow([['PAN', form.proposer?.pan], ['Pincode', form.cover?.pincode], ['CKYC / Bank / eIA', 'Captured at issuance']]);

  // ---- 2. Applicants ----
  sectionHead('2. Details of Applicants for Insurance');
  form.members.forEach((m, i) => {
    fieldRow([
      [`Applicant ${i + 1} — Relationship`, REL_LABELS[m.relationship] || m.relationship],
      ['Date of birth', m.dob],
      ['Age', `${m.age} years`],
      ['PED declared', m.ped_declared ? 'Yes' : 'No']
    ]);
  });

  // ---- 3. Coverage selection ----
  sectionHead('3. Coverage Selection');
  fieldRow([
    ['Base sum insured', inr(form.cover.sum_insured)],
    ['Policy term', `${form.cover.tenure_years} year(s)`],
    ['Lives covered', String(form.members.length)]
  ]);
  ensure(24);
  doc.setTextColor(...MUTED).setFontSize(7.5);
  doc.text('OPTIONAL COVERS SELECTED', M, y);
  doc.setTextColor(30, 30, 30).setFontSize(9.5).setFont('helvetica', 'normal');
  const addonText = form.cover.addons.length ? form.cover.addons.map((a) => a.replaceAll('_', ' ')).join('  ·  ') : 'None selected';
  doc.text(addonText, M, y + 13, { maxWidth: W - 2 * M });
  y += 34;
  fieldRow([['Total premium (incl. GST)', inr(form.premium.total)], ['Base', inr(form.premium.base)], ['Loadings', inr(form.premium.loadings)], ['Discounts', inr(form.premium.discounts)]]);

  // ---- 4. Nomination ----
  sectionHead('4. Nomination');
  if (form.nominee) {
    fieldRow([['Nominee name', form.nominee.name], ['Relation to proposer', form.nominee.relation], ['Nominee DOB', form.nominee.dob || '—']]);
  } else {
    ensure(20);
    doc.setTextColor(30, 30, 30).setFontSize(9.5);
    doc.text('Not provided — optional at proposal stage; to be captured before issuance.', M, y);
    y += 24;
  }

  // ---- 5. Medical declarations (Y/N grid) ----
  sectionHead('5. Medical & Lifestyle Declarations');
  const qColW = W - 2 * M - form.members.length * 58;
  ensure(20);
  doc.setFontSize(7.5).setTextColor(...MUTED);
  doc.text('QUESTION', M, y);
  form.members.forEach((m, i) => doc.text(`APPL. ${i + 1}`, M + qColW + i * 58, y));
  y += 6;
  MEDICAL_QUESTIONS.forEach((q, qi) => {
    ensure(26);
    if (qi % 2 === 0) { doc.setFillColor(...LIGHT); doc.rect(M - 4, y + 2, W - 2 * M + 8, 22, 'F'); }
    doc.setTextColor(30, 30, 30).setFontSize(8.5).setFont('helvetica', 'normal');
    doc.text(q.text, M, y + 15, { maxWidth: qColW - 14 });
    form.members.forEach((m, i) => {
      const declared = m.declarations ? m.declarations[q.code] : undefined;
      // The /form endpoint doesn't expose raw declarations — fall back to the
      // member-level PED flag when unavailable.
      const val = declared === undefined ? (m.ped_declared ? 'Y*' : 'N') : declared ? 'Y' : 'N';
      doc.setFont('helvetica', 'bold');
      doc.text(val, M + qColW + i * 58, y + 15);
    });
    y += 24;
  });
  ensure(14);
  doc.setTextColor(...MUTED).setFontSize(7.5);
  doc.text('* Member declared at least one condition; per-question detail is held in the core system.', M, y + 4);
  y += 20;

  // ---- 6. Declaration ----
  sectionHead('6. Declaration');
  ensure(70);
  doc.setTextColor(30, 30, 30).setFontSize(8.5).setFont('helvetica', 'normal');
  doc.text(
    'I hereby declare that the statements and particulars above are true and complete to the best of my ' +
    'knowledge, and that this proposal shall form the basis of the insurance contract. I understand cover ' +
    'begins only after full premium is received and the risk is explicitly accepted.',
    M, y, { maxWidth: W - 2 * M }
  );
  y += 44;
  fieldRow([['Date', new Date().toLocaleDateString('en-IN')], ['Place', '—'], ['Signature of proposer', 'Digitally accepted (demo)']]);

  footer();
  doc.save(`Zenith-Proposal-${form.proposal_id}.pdf`);
}
