// Feasly icon set — SF-Symbols-flavoured stroke glyphs, drawn inline so they
// inherit currentColor and need no network. 24×24 grid, 1.7 stroke, round
// caps. One component (`I`) + a typed wrapper (`TypeIcon`) for artifact types.
import React from 'react';

const P = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m16.6 16.6 4.4 4.4" /></>,
  message: <><rect x="3" y="4" width="18" height="13" rx="4.5" /><path d="M8.5 17 7 21l5-4" /></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
  clipboard: <><rect x="8" y="2" width="8" height="4" rx="1.2" /><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" /><path d="M9 12h6M9 16h4" /></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h4" /></>,
  layers: <><path d="m12 2 10 5-10 5L2 7z" /><path d="m2 12 10 5 10-5" /><path d="m2 17 10 5 10-5" /></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M7 10h7M7 14h10" /></>,
  checks: <><path d="m3 7 2 2 4-4" /><path d="m3 17 2 2 4-4" /><path d="M13 7h8M13 17h8" /></>,
  flask: <><path d="M9.5 3h5" /><path d="M10 3v6l-5 9.6A2 2 0 0 0 6.8 21.5h10.4a2 2 0 0 0 1.8-2.9L14 9V3" /><path d="M7.6 15h8.8" /></>,
  code: <><path d="m16 18 6-6-6-6" /><path d="m8 6-6 6 6 6" /></>,
  archive: <><rect x="3" y="3" width="18" height="5" rx="1.5" /><path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></>,
  network: <><circle cx="12" cy="5" r="2.6" /><circle cx="5" cy="19" r="2.6" /><circle cx="19" cy="19" r="2.6" /><path d="M10.9 7.3 6.2 16.7M13.1 7.3l4.7 9.4M7.6 19h8.8" /></>,
  scatter: <><circle cx="6.5" cy="6.5" r="2" /><circle cx="17.5" cy="5" r="2" /><circle cx="9" cy="17.5" r="2" /><circle cx="19" cy="15" r="2" /><circle cx="13" cy="10.5" r="1.3" /></>,
  rocket: <><path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.18 2.18 0 0 0-2.9-.1z" /><path d="m12 15-3-3a22 22 0 0 1 2-4A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22 22 0 0 1-4 2z" /><path d="M9 12H4s.5-3 2-4c1.6-1.1 5 0 5 0" /><path d="M12 15v5s3-.5 4-2c1.1-1.6 0-5 0-5" /></>,
  sliders: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" /><path d="M1 14h6M9 8h6M17 16h6" /></>,
  arrowUp: <><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  chevron: <><path d="m6 9 6 6 6-9" transform="scale(1) translate(0 0)" /></>,
  chevronDown: <><path d="m6 9 6 6 6-6" /></>,
  chevronLeft: <><path d="m15 18-6-6 6-6" /></>,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5" /><path d="M12 3v12" /></>,
  folder: <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></>,
  x: <><path d="M18 6 6 18M6 6l12 12" /></>,
  play: <><path d="m7 4 13 8-13 8z" /></>,
  pause: <><path d="M8 5v14M16 5v14" /></>,
  copy: <><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
  refresh: <><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" /><path d="M3 21v-5h5" /></>,
  cpu: <><rect x="5" y="5" width="14" height="14" rx="2.5" /><rect x="9.5" y="9.5" width="5" height="5" rx="1" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
  pen: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.5 2.5 4 5.6 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.6-4-9s1.5-6.5 4-9z" /></>,
  plug: <><path d="M9 7V3M15 7V3" /><path d="M7 7h10v4a5 5 0 0 1-10 0z" /><path d="M12 16v5" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  cloud: <><path d="M17.5 19a4.5 4.5 0 0 0 .42-8.98 6.5 6.5 0 0 0-12.6 1.74A4 4 0 0 0 6 19z" /></>,
  send: <><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></>,
  trash: <><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M10 11v6M14 11v6" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></>,
  sparkle: <><path d="M12 2.8 14 9l6.2 2L14 13l-2 6.2L10 13l-6.2-2L10 9z" fill="currentColor" stroke="none" /></>,
  dot: <><circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" /></>
};

export function I({ n, s = 16, sw = 1.7, className = '', style }) {
  return (
    <svg className={'fsi ' + className} style={style} width={s} height={s} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[n] || P.dot}
    </svg>
  );
}

// ---- artifact-type visual language (fixed semantic palette, Apple system hues) ----
export const TYPE_GLYPH = {
  research: 'book', conversation: 'message', brd: 'clipboard', pdn: 'file',
  epic: 'layers', story: 'card', fr: 'checks', test: 'flask', code: 'code'
};
export const TYPE_TINT = {
  research: '#ff9f0a', brd: '#0a84ff', pdn: '#5e5ce6', epic: '#bf5af2',
  story: '#30b0c7', fr: '#f26eb1', test: '#34c759', code: '#8e8e93', conversation: '#64d2ff'
};

export function TypeIcon({ type, s = 14, tint = true, style }) {
  return <I n={TYPE_GLYPH[type] || 'file'} s={s} style={{ color: tint ? TYPE_TINT[type] || 'currentColor' : undefined, flexShrink: 0, ...style }} />;
}
