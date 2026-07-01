import React, { useState } from 'react';

// TODO: update once the GitHub repo exists (filled in right after `gh repo create`).
const REPO_URL = 'https://github.com/shreysagar/elevate-demo';
const DISMISS_KEY = 'elevate-demo-banner-dismissed';

export default function DemoBanner() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');
  if (dismissed) return null;
  const dismiss = () => { localStorage.setItem(DISMISS_KEY, '1'); setDismissed(true); };
  return (
    <div className="demobanner">
      <span>
        Portfolio demo by <b>Shrey Sagar</b> — simulated payments, data resets periodically.{' '}
        <a href={REPO_URL} target="_blank" rel="noreferrer">View source on GitHub ↗</a>
      </span>
      <button className="demobanner-close" onClick={dismiss} aria-label="Dismiss">×</button>
    </div>
  );
}
