import React, { useState } from 'react';
import { Star } from 'lucide-react';

/** Read-only star rating; fractional averages fill partially. */
export const Stars: React.FC<{ value: number; size?: number; label?: string }> = ({ value, size = 14, label }) => (
  <span className="stars" role="img" aria-label={label ?? `${value.toFixed(1)} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((i) => {
      const fill = Math.max(0, Math.min(1, value - (i - 1)));
      return (
        <span key={i} className="star" style={{ width: size, height: size }}>
          <Star size={size} className="star-empty" />
          <span className="star-fill" style={{ width: `${fill * 100}%` }}>
            <Star size={size} />
          </span>
        </span>
      );
    })}
  </span>
);

/** Compact "★ 4.5 (12)" line for product cards; renders nothing when there are no reviews. */
export const RatingLine: React.FC<{ average?: number | null; count?: number }> = ({ average, count }) => {
  if (!count || average == null) return null;
  return (
    <span className="rating-line">
      <Stars value={average} size={13} />
      <span>{average.toFixed(1)}</span>
      <span className="subtle">({count})</span>
    </span>
  );
};

/** Clickable 1–5 star picker for review forms. */
export const StarInput: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="star-input" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
          className={i <= shown ? 'on' : ''}
          onMouseEnter={() => setHover(i)}
          onClick={() => onChange(i)}
        >
          <Star size={24} />
        </button>
      ))}
    </div>
  );
};
