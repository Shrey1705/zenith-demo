// Product analytics for the demo tenant — the same fire-and-forget event
// pattern Amplitude-class tools use, scaled to what the funnel actually
// needs: anonymous session id, step views, clicks. Analytics must never
// break or slow the journey, so every path here swallows its own errors.
const SID_KEY = 'zx-sid';

function sid() {
  try {
    let s = sessionStorage.getItem(SID_KEY);
    if (!s) { s = Math.random().toString(36).slice(2, 10); sessionStorage.setItem(SID_KEY, s); }
    return s;
  } catch { return 'anon'; }
}

export function track(type, name) {
  try {
    const body = JSON.stringify({ type, name: String(name || '').slice(0, 80), sid: sid() });
    const sent = navigator.sendBeacon
      && navigator.sendBeacon('/api/ai/analytics/event', new Blob([body], { type: 'application/json' }));
    if (!sent) {
      fetch('/api/ai/analytics/event', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true
      }).catch(() => { /* offline — the funnel just misses one event */ });
    }
  } catch { /* never surface analytics errors to the buyer */ }
}
