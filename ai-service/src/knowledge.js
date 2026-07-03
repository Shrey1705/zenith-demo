// Entity-impact knowledge base.
// Every impact points at a REAL file in this repo + a regex the analyzer
// uses to pull evidence lines. Production design swaps this hand-built map
// for a static-analysis dependency graph + LLM mapping (see README).

const LAYERS = {
  frontend: { label: 'Journey frontend', system: 'journey-app' },
  api:      { label: 'API contract',     system: 'core-service' },
  core:     { label: 'Core business rules', system: 'core-service' },
  db:       { label: 'Core data model',  system: 'core-service' }
};

const ENTITIES = {
  relationship: {
    label: 'Covered-member relationships',
    keywords: ['parent-in-law', 'parents-in-law', 'in-law', 'in law', 'father-in-law', 'mother-in-law', 'sibling', 'brother', 'sister', 'grandparent', 'relationship'],
    size: 'L', sprints: '2–3 sprints (core release-train dependency)',
    impacts: [
      { layer: 'core', file: 'core-service/src/rules/underwriting.rules.yaml', pattern: /permitted_relationships/, v: 'r',
        change: 'Extend permitted_relationships; define entry-age & PED rules for new relations (UW sign-off)' },
      { layer: 'db', file: 'core-service/src/db/schema.sql', pattern: /relationship\s+VARCHAR/, v: 'r',
        change: 'PROPOSAL_MEMBER.relationship CHECK constraint — core schema migration' },
      { layer: 'api', file: 'core-service/src/api/contracts/proposal-v2.contract.json', pattern: /"SELF", "SPOUSE"/, v: 'a',
        change: 'Extend members[].relationship enum; v2 extension vs v3 versioning decision' },
      { layer: 'core', file: 'core-service/src/services/premiumService.js', pattern: /permitted_relationships|rels\.includes/, v: 'a',
        change: 'validate() enforces permitted relationships — picks up rule change automatically, needs regression' },
      { layer: 'frontend', file: 'journey-app/src/lib/validation.js', pattern: /ALLOWED_RELATIONSHIPS/, v: 'g',
        change: 'ALLOWED_RELATIONSHIPS mirror list must be updated (known duplication tech-debt)' }
    ],
    risks: [
      'Underwriting must approve eligibility & pricing for new relations before build starts',
      'Relationship list duplicated between core rules and journey validation — drift risk, flag for tech-debt fix',
      'Core DB CHECK-constraint migration needs a release-train slot'
    ],
    openq: [
      'Do in-law relations count toward max_adults (currently 4)?',
      'Same PED waiting for in-law members?',
      'Reinsurance treaty coverage for extended relationship set?'
    ]
  },

  nominee: {
    label: 'Nominee capture rules',
    keywords: ['nominee', 'nomination'],
    size: 'S', sprints: '1 sprint',
    impacts: [
      { layer: 'core', file: 'core-service/src/rules/underwriting.rules.yaml', pattern: /required_at_proposal/, v: 'a',
        change: 'Flip nominee.required_at_proposal to true — core rule change, but config-level' },
      { layer: 'api', file: 'core-service/src/api/contracts/proposal-v2.contract.json', pattern: /"nominee"/, v: 'a',
        change: 'nominee optional→required is BREAKING for other v2 consumers (agent-portal, aggregators)' },
      { layer: 'frontend', file: 'journey-app/src/journey/steps.jsx', pattern: /skip|Skip/, v: 'g',
        change: 'Remove skip affordance on nominee step; expect funnel impact — instrument before/after' },
      { layer: 'frontend', file: 'journey-app/src/lib/validation.js', pattern: /validateNominee/, v: 'g',
        change: 'validateNominee: null no longer valid' }
    ],
    risks: [
      'Making a skippable step mandatory will hit journey conversion — A/B or phased rollout recommended',
      'optional→required breaks any consumer not sending nominee (aggregators on v2)'
    ],
    openq: [
      'Grandfather in-flight proposals without nominee?',
      'Regulatory mandate or data-quality goal? (changes urgency & rollout)'
    ]
  },

  ped_display: {
    label: 'PED waiting-period visibility at review',
    keywords: ['waiting period', 'show ped', 'display ped', 'ped on quote', 'ped on review', 'pre-existing on', 'waiting-period'],
    size: 'S', sprints: '1 sprint',
    impacts: [
      { layer: 'api', file: 'core-service/src/api/contracts/proposal-v2.contract.json', pattern: /NOT exposed in v2/, v: 'a',
        change: 'Add per-member ped_waiting_months to v2 response (contract explicitly notes it is missing)' },
      { layer: 'core', file: 'core-service/src/services/proposalService.js', pattern: /intentionally not exposed|not exposed/, v: 'g',
        change: 'proposalForm() must compute member-level waiting from underwriting rules + Early Cover addon' },
      { layer: 'frontend', file: 'journey-app/src/journey/steps.jsx', pattern: /TODO.*PED|ped_waiting/i, v: 'g',
        change: 'Render waiting period on review screen (TODO already stubbed in code)' }
    ],
    risks: [
      'Additive response field — low integration risk, but consumers must tolerate unknown fields',
      'Disclosing waiting periods at review may raise drop-off — measure, and get compliance copy review'
    ],
    openq: ['Member-level or policy-level display?', 'Compliance sign-off on disclosure copy?']
  },

  payment_frequency: {
    label: 'Premium payment frequency (monthly / EMI)',
    keywords: ['monthly premium', 'emi', 'installment', 'instalment', 'monthly payment', 'pay monthly', 'payment frequency'],
    size: 'XL', sprints: '3–4 sprints; actuarial + finance dependency, start filings first',
    impacts: [
      { layer: 'core', file: 'core-service/src/rules/premium.rules.yaml', pattern: /payment_frequency_options/, v: 'r',
        change: 'payment_frequency_options is [ANNUAL] only — rating, short-period tables, and dunning rules all new' },
      { layer: 'core', file: 'core-service/src/services/proposalService.js', pattern: /confirmPayment/, v: 'r',
        change: 'Payment lifecycle assumes single payment → issuance; recurring mandate + lapse/grace logic is net-new' },
      { layer: 'db', file: 'core-service/src/db/schema.sql', pattern: /PAYMENT_LINK|payment_status/, v: 'r',
        change: 'Payment model is one link = one payment; needs schedule/installment tables' },
      { layer: 'api', file: 'core-service/src/api/contracts/proposal-v2.contract.json', pattern: /payment-link/, v: 'a',
        change: 'New mandate-setup endpoints; payment-link contract extended for recurring' },
      { layer: 'frontend', file: 'journey-app/src/pay/PayLink.jsx', pattern: /confirm/i, v: 'g',
        change: 'Payment page needs frequency selection + mandate consent UX' }
    ],
    risks: [
      'Monthly mode changes the actuarial basis — needs certification and possibly product refiling',
      'Policy issuance before full premium collection changes risk exposure — lapse & grace rules needed',
      'Recurring payments bring PG mandate compliance (e-mandate) — new vendor integration'
    ],
    openq: [
      'Issue policy on first installment or after full collection?',
      'Auto-debit mandate (e-NACH/UPI autopay) or card-on-file?',
      'What happens to claims during an unpaid-installment grace period?'
    ]
  },

  sum_insured: {
    label: 'Sum-insured bands',
    keywords: ['sum insured', 'si band', 'cover amount', '2 crore', '1 crore', 'higher cover', 'crore'],
    size: 'M', sprints: '1–2 sprints after actuarial rates',
    impacts: [
      { layer: 'core', file: 'core-service/src/rules/underwriting.rules.yaml', pattern: /sum_insured_bands/, v: 'r',
        change: 'Extend sum_insured_bands; medical-test grid & UW limits for the new band' },
      { layer: 'core', file: 'core-service/src/rules/premium.rules.yaml', pattern: /sum_insured_multiplier/, v: 'r',
        change: 'sum_insured_multiplier has no rate for the new band — actuarial input required' },
      { layer: 'api', file: 'core-service/src/api/contracts/proposal-v2.contract.json', pattern: /enum_ref.*sum_insured_bands/, v: 'g',
        change: 'Contract references the band list by enum_ref — additive, verify no hardcoded caps in consumers' },
      { layer: 'frontend', file: 'journey-app/src/journey/steps.jsx', pattern: /sum_insured_bands|sumInsured/i, v: 'g',
        change: 'SI selector renders from core catalog API — verify ₹-crore formatting for large amounts' }
    ],
    risks: [
      'High-SI bands usually trigger pre-policy medical underwriting — a hidden journey branch may be needed',
      'Reinsurance capacity check before opening the band'
    ],
    openq: ['Tele-underwriting or physical medicals for the new band?', 'Zone restrictions for high SI?']
  }
};

module.exports = { LAYERS, ENTITIES };
