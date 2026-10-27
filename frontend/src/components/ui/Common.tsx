import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Boxes, Minus, Moon, Plus, Search, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const Logo: React.FC<{ to?: string }> = ({ to = '/' }) => (
  <Link to={to} className="logo">
    <span className="logo-mark">
      <Boxes />
    </span>
    StockFlow
  </Link>
);

export const PageHeader: React.FC<{
  title: string;
  description?: React.ReactNode;
  back?: { to: string; label: string };
  actions?: React.ReactNode;
}> = ({ title, description, back, actions }) => (
  <div className="page-header">
    <div>
      {back && (
        <Link to={back.to} className="breadcrumb">
          <ArrowLeft /> {back.label}
        </Link>
      )}
      <h1 className="page-title">{title}</h1>
      {description && <p className="page-desc">{description}</p>}
    </div>
    {actions && <div className="row">{actions}</div>}
  </div>
);

export const Field: React.FC<{
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ label, hint, error, className, children }) => (
  <label className={`field ${className ?? ''}`}>
    <span className="field-label">{label}</span>
    {children}
    {error ? <span className="field-error">{error}</span> : hint && <span className="field-hint">{hint}</span>}
  </label>
);

export const SearchInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder = 'Search…' }) => (
  <div className="input-group">
    <Search />
    <input
      className="input"
      type="search"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      className="btn btn-ghost btn-icon"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? <Moon /> : <Sun />}
    </button>
  );
};

export const QuantityInput: React.FC<{
  value: number;
  min?: number;
  max: number;
  onChange: (v: number) => void;
  small?: boolean;
}> = ({ value, min = 1, max, onChange, small }) => (
  <div className={`qty ${small ? 'qty-sm' : ''}`}>
    <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease">
      <Minus />
    </button>
    <span>{value}</span>
    <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase">
      <Plus />
    </button>
  </div>
);

export const Tabs = <T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
}) => (
  <div className="tabs" role="tablist">
    {options.map((o) => (
      <button
        key={o.value}
        role="tab"
        aria-selected={value === o.value}
        className={`tab ${value === o.value ? 'active' : ''}`}
        onClick={() => onChange(o.value)}
      >
        {o.label}
        {o.count !== undefined && <span className="count">{o.count}</span>}
      </button>
    ))}
  </div>
);
