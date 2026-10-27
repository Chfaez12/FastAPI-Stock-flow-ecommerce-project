import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Page numbers to show: always the first and last, plus a window around the current page. */
function pageList(page: number, pages: number): (number | '…')[] {
  const wanted = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) out.push('…');
    out.push(p);
  });
  return out;
}

export const Pagination: React.FC<{
  page: number;
  pages: number;
  total: number;
  size: number;
  onChange: (page: number) => void;
  noun?: string;
}> = ({ page, pages, total, size, onChange, noun = 'results' }) => {
  if (total === 0) return null;
  const from = (page - 1) * size + 1;
  const to = Math.min(page * size, total);

  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="muted">
        {from}–{to} of {total} {noun}
      </span>
      {pages > 1 && (
        <div className="pagination-pages">
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft />
          </button>
          {pageList(page, pages).map((p, i) =>
            p === '…' ? (
              <span key={`gap-${i}`} className="pagination-gap">…</span>
            ) : (
              <button
                key={p}
                className={`pagination-page ${p === page ? 'active' : ''}`}
                onClick={() => onChange(p)}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </button>
            ),
          )}
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Next page">
            <ChevronRight />
          </button>
        </div>
      )}
    </nav>
  );
};
