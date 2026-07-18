// Pricing config — the single place payment goes live. Paste the Stripe
// Payment Link URLs here (Stripe dashboard → Payment Links → create one per
// plan) and the /pricing buttons switch from "Request access" (email) to
// real checkout automatically. No other code changes needed.
export const PAYMENT_LINKS = {
  monthly: '',   // Founding member — $19/month
  lifetime: '',  // Founding lifetime — $99 once
  team: ''       // Team pilot — $49/month per team
};

export const CONTACT_EMAIL = 'shreysagar17@gmail.com';

export const PLANS = [
  {
    id: 'free', name: 'Free', price: '$0', per: 'forever', cta: 'start',
    tagline: 'A real decision workspace, not a trial. Local AI included — unlimited, because it runs on your machine.',
    bullets: [
      '1 product · 3 projects · 10 decisions · 30 research notes',
      'Full artifact chain, playbooks, sprint board, ⌘K — nothing crippled',
      'Unlimited local AI chat & RAG (your machine, your data)',
      'Private synced workspace with magic-link sign-in',
      'Upgrade only when you outgrow the limits'
    ]
  },
  {
    id: 'monthly', name: 'Founding member', price: '$19', per: '/ month',
    tagline: 'For individual PMs who want their product knowledge in one private place.',
    bullets: [
      'Private synced workspace — sign in from any machine',
      'Full artifact chain: research → BRD → stories → tests, always traceable',
      'Six PM playbooks that write from your own documents',
      'Local AI: your documents never leave your laptop',
      'Founding price locked for life'
    ]
  },
  {
    id: 'lifetime', name: 'Founding lifetime', price: '$99', per: 'once', featured: true,
    tagline: 'Everything in Founding member, one payment, forever. Limited to 10 seats.',
    bullets: [
      'Everything in Founding member',
      'Lifetime access — no subscription, ever',
      'Direct line to the founder for requests and support',
      'Your feedback shapes the roadmap',
      'Only 10 seats at this price'
    ]
  },
  {
    id: 'team', name: 'Team pilot', price: '$49', per: '/ month per team',
    tagline: 'For product teams in regulated industries — compliance-friendly by architecture.',
    bullets: [
      'Up to 10 members in a shared workspace',
      'AI runs on your own machines — nothing to clear with security',
      'Versioned BRDs with staleness warnings engineering can trust',
      'Onboarding session with the founder included',
      'Cancel any time during the pilot'
    ]
  }
];
