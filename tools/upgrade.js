#!/usr/bin/env node
// Founder upgrade tool — flip an account's plan after a payment lands.
//
//   node tools/upgrade.js customer@company.com pro
//   node tools/upgrade.js customer@company.com free      # downgrade
//   node tools/upgrade.js customer@company.com pro --local
//
// Uses ADMIN_KEY from the repo's .env (must match the deployed env).
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const email = args.find((a) => a.includes('@'));
const plan = args.includes('free') && !args.includes('pro') ? 'free' : 'pro';
const base = args.includes('--local') ? 'http://localhost:5173/api/ai' : 'https://zenith-health-demo.vercel.app/api/ai';
if (!email) { console.error('Usage: node tools/upgrade.js someone@email.com [pro|free] [--local]'); process.exit(1); }

function envKey() {
  try {
    const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    return env.match(/^ADMIN_KEY=(.+)$/m)?.[1]?.trim() || null;
  } catch { return null; }
}
const key = process.env.ADMIN_KEY || envKey();
if (!key) { console.error('No ADMIN_KEY in .env — cannot administer plans.'); process.exit(1); }

fetch(`${base}/auth/set-plan`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
  body: JSON.stringify({ email, plan })
})
  .then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    console.log(`✓ ${data.email} is now on the ${data.plan.toUpperCase()} plan.`);
    console.log('They pick it up on their next sign-in or page load.');
  })
  .catch((e) => { console.error('Failed:', e.message); process.exit(1); });
