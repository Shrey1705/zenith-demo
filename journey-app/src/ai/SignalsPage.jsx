// Signals — the workspace's own Amplitude. Two live sources from the demo
// tenant: (1) the buy journey's anonymous event stream, rendered as a funnel
// with drop-offs and click heat; (2) real booking data aggregated into
// insight bullets. One click turns either into a research note — signals
// become evidence, evidence feeds decisions. That's the whole loop.
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { I } from './icons';
import { ai } from '../lib/api';
import { useWorkspace } from './AiPortal';
import { useWS, mutate, uid, now, can } from './workspace';

export default function SignalsPage() {
  const { token } = useWorkspace();
  const ws = useWS();
  const nav = useNavigate();
  const [funnel, setFunnel] = useState(null);
  const [bookings, setBookings] = useState(null);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState('');
  const [simBusy, setSimBusy] = useState(false);
  const [targetPid, setTargetPid] = useState(ws.projects[0]?.id || '');

  const load = () => {
    ai.funnel(token).then(setFunnel).catch((e) => setErr(e.message));
    ai.bookingInsights(token).then(setBookings).catch(() => setBookings(null));
  };
  useEffect(load, []); // eslint-disable-line

  // Demo helper, honestly labelled: synthesizes a realistic traffic pattern
  // (decaying funnel) so the page can be shown without 25 manual walkthroughs.
  const simulate = async () => {
    setSimBusy(true);
    const steps = ['Get a quote', 'Your details', 'Review & pay', 'Payment', 'Policy issued'];
    const clicks = ['Fill demo data', 'Get my quote →', 'Continue →', 'Pay now', 'APEX', 'Add maternity cover'];
    const reach = [1, 0.62, 0.41, 0.3, 0.24]; // typical D2C insurance funnel shape
    const jobs = [];
    for (let u = 0; u < 25; u++) {
      const sid = 'sim' + u + Math.random().toString(36).slice(2, 6);
      const depth = reach.filter(() => true).reduce((d, r, i) => (Math.random() < r ? i : d), 0);
      for (let s = 0; s <= depth; s++) {
        jobs.push(fetch('/api/ai/analytics/event', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'step', name: steps[s], sid })
        }).catch(() => {}));
        if (Math.random() < 0.7) {
          jobs.push(fetch('/api/ai/analytics/event', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'click', name: clicks[Math.floor(Math.random() * clicks.length)], sid })
          }).catch(() => {}));
        }
      }
    }
    await Promise.all(jobs);
    setSimBusy(false);
    load();
  };

  const saveAsResearch = (title, content) => {
    const pid = targetPid || ws.projects[0]?.id;
    if (!pid) return;
    const doc = { id: uid(), title, source: 'analytics', sourceDetail: 'Signals snapshot', createdAt: now(), content };
    mutate((w) => ({ ...w, projects: w.projects.map((p) => (p.id === pid ? { ...p, research: [doc, ...p.research] } : p)) }));
    setSaved(title);
    setTimeout(() => setSaved(''), 2200);
  };

  const funnelMd = () => !funnel ? '' :
    `Journey funnel snapshot (${funnel.totalSessions} sessions, ${new Date().toLocaleDateString('en-IN')})\n\n` +
    funnel.steps.map((s, i) => `${i + 1}. ${s.name}: ${s.sessions} sessions${s.dropFromPrev ? ` (−${s.dropFromPrev} dropped)` : ''}`).join('\n') +
    `\n\nEnd-to-end conversion: ${funnel.conversionPct}%.\nBiggest drop: ${biggestDrop(funnel)?.name || '—'}.\n\nTop clicks: ${funnel.topClicks.slice(0, 6).map((c) => `${c.name} (${c.count})`).join(', ')}`;
  const bookingsMd = () => !bookings ? '' :
    `Booking insights (${bookings.sampleSize} proposals)\n\n` + bookings.insights.map((x) => `- ${x}`).join('\n');

  const max = funnel?.steps?.[0]?.sessions || 1;

  return (
    <div className="docwrap">
      <h1 className="doch1">Signals</h1>
      <p className="docsub">Live behaviour from the Zenith tenant — where buyers drop, what they click, what they actually buy. Save any snapshot as research and it becomes evidence a decision can cite.</p>
      {err && <p className="error">{err}</p>}

      <div className="sighead">
        <h3 className="docsecth" style={{ margin: 0 }}>Buy-journey funnel</h3>
        <span className="sigacts">
          <button className="fs-linkbtn" onClick={load}><I n="refresh" s={12} /> Refresh</button>
          <button className="fs-linkbtn" onClick={() => nav('/buy')}>Generate real events (open the journey) →</button>
          <button className="fs-linkbtn" disabled={simBusy} onClick={simulate}>{simBusy ? 'Simulating…' : 'Simulate 25 sessions (demo)'}</button>
        </span>
      </div>

      {funnel && funnel.totalSessions > 0 ? (
        <div className="funnel">
          {funnel.steps.map((s, i) => (
            <div key={s.name} className="funrow">
              <span className="funlabel">{s.name}</span>
              <span className="funbarwrap">
                <span className="funbar" style={{ width: `${Math.max(3, (s.sessions / max) * 100)}%` }}>{s.sessions}</span>
              </span>
              <span className="fundrop">{i > 0 && s.dropFromPrev > 0 ? `−${s.dropFromPrev}` : ''}</span>
            </div>
          ))}
          <p className="hint" style={{ marginTop: 8 }}>
            {funnel.totalSessions} sessions · {funnel.conversionPct}% reach issuance · biggest leak: <b>{biggestDrop(funnel)?.name}</b>
          </p>
          {funnel.topClicks.length > 0 && (
            <>
              <h4 className="sigsub">Click heat</h4>
              <div className="clickheat">
                {funnel.topClicks.map((c) => <span key={c.name} className="convchip ghost">{c.name} · {c.count}</span>)}
              </div>
            </>
          )}
        </div>
      ) : <p className="railempty">No events yet — walk through the Buy journey (every step and click is tracked), or simulate demo traffic.</p>}

      <div className="sighead" style={{ marginTop: 30 }}>
        <h3 className="docsecth" style={{ margin: 0 }}>Booking insights</h3>
      </div>
      {bookings ? (
        <div className="insightlist">
          {bookings.insights.map((x, i) => <p key={i} className="insightrow"><I n="sparkle" s={12} style={{ color: 'var(--p)' }} /> {x}</p>)}
          {bookings.siBands?.length > 0 && (
            <p className="hint">SI mix: {bookings.siBands.slice(0, 4).map((b) => `₹${b.band >= 9999999 ? 'Unlimited' : (b.band / 100000).toFixed(0) + 'L'} ×${b.count}`).join(' · ')}</p>
          )}
        </div>
      ) : <p className="railempty">Booking data unavailable.</p>}

      {can(ws, 'edit') && ws.projects.length > 0 && (
        <div className="sigsave">
          <select value={targetPid} onChange={(e) => setTargetPid(e.target.value)}>
            {ws.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="btn" disabled={!funnel?.totalSessions} onClick={() => saveAsResearch(`Journey funnel — ${new Date().toLocaleDateString('en-IN')}`, funnelMd())}>Save funnel as evidence</button>
          <button className="btn ghost" disabled={!bookings?.sampleSize} onClick={() => saveAsResearch(`Booking insights — ${new Date().toLocaleDateString('en-IN')}`, bookingsMd())}>Save insights as evidence</button>
          {saved && <span className="hint">✓ Saved “{saved}” to research — link it on a decision.</span>}
        </div>
      )}
    </div>
  );
}

const biggestDrop = (f) => [...(f?.steps || [])].sort((a, b) => b.dropFromPrev - a.dropFromPrev)[0];
