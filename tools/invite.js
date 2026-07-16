#!/usr/bin/env node
// Founder invite tool — mint a sign-in link for a pilot user and send it
// yourself over WhatsApp/Gmail. No email service needed: the link carries a
// signed session token the app validates on open.
//
//   node tools/invite.js someone@company.com
//   node tools/invite.js someone@company.com --days 14
//   node tools/invite.js someone@company.com --local      # link for localhost dev
//
// Signs with AI_AUTH_SECRET from the repo's .env (production) or the dev
// default (--local). The secret in .env must match what Vercel runs with.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const email = args.find((a) => a.includes('@'));
const local = args.includes('--local');
const days = parseInt(args[args.indexOf('--days') + 1], 10) || 30;
if (!email) { console.error('Usage: node tools/invite.js someone@email.com [--days 30] [--local]'); process.exit(1); }

function envSecret() {
  try {
    const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
    const m = env.match(/^AI_AUTH_SECRET=(.+)$/m);
    if (m) return m[1].trim();
  } catch { /* no .env */ }
  return process.env.AI_AUTH_SECRET || null;
}

// Local dev runs on the built-in default secret; production links must be
// signed with the deployed secret from .env.
const secret = local ? 'zenith-demo-secret' : envSecret();
if (!secret) {
  console.error('No AI_AUTH_SECRET found in .env — production links must be signed with the deployed secret.');
  process.exit(1);
}

// Same token scheme as ai-service/src/app.js signToken().
const payload = `${email.toLowerCase()}|${Date.now() + days * 86400e3}`;
const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 24);
const token = `tok_${Buffer.from(payload).toString('base64url')}.${sig}`;

const base = local ? 'http://localhost:5173' : 'https://zenith-health-demo.vercel.app';
console.log(`\nInvite for ${email} (valid ${days} days):\n`);
console.log(`${base}/ai/verify?token=${token}\n`);
console.log('Send it over WhatsApp or Gmail — opening it signs them straight in.');
