// "Every plan includes" — base covers as a paged tile show. Desktop fits all
// tiles in a 4-across grid; on smaller screens the grid pages 4 at a time
// with arrows + dots. Tapping a tile opens its detail in a strip below,
// keeping section height constant.
import React, { useEffect, useState } from 'react';

const PER_PAGE_DESKTOP = 12;   // 4 × 3 grid
const PER_PAGE_MOBILE = 4;     // 2 × 2 per page

export default function BaseCovers({ catalog }) {
  const covers = catalog?.common_benefits || [];
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 860px)').matches);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)');
    const fn = (e) => { setIsMobile(e.matches); setPage(0); };
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  const perPage = isMobile ? PER_PAGE_MOBILE : PER_PAGE_DESKTOP;
  const pages = Math.max(1, Math.ceil(covers.length / perPage));
  const cur = Math.min(page, pages - 1);
  const shown = covers.slice(cur * perPage, cur * perPage + perPage);
  const detail = covers.find((c) => c.code === selected);

  return (
    <>
      <div className="covergrid">
        {shown.map((c) => (
          <button
            key={c.code}
            className={'covertile' + (selected === c.code ? ' on' : '')}
            onClick={() => setSelected(selected === c.code ? null : c.code)}
          >
            <span className="coverticon">{c.icon}</span>
            <b>{c.label}</b>
            <small>{c.tagline}</small>
          </button>
        ))}
      </div>
      {detail && <p className="coverdetail"><b>{detail.icon} {detail.label}:</b> {detail.description}</p>}
      {pages > 1 && (
        <div className="pager">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={cur === 0} aria-label="previous page">‹</button>
          {Array.from({ length: pages }, (_, i) => (
            <button key={i} className={'dot' + (i === cur ? ' on' : '')} onClick={() => setPage(i)} aria-label={`page ${i + 1}`} />
          ))}
          <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={cur === pages - 1} aria-label="next page">›</button>
        </div>
      )}
    </>
  );
}
