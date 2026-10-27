import React from 'react';
import { AlertCircle, type LucideIcon } from 'lucide-react';

export const Spinner: React.FC<{ large?: boolean }> = ({ large }) => (
  <span className={`spinner ${large ? 'spinner-lg' : ''}`} aria-label="Loading" />
);

export const PageLoader: React.FC = () => (
  <div className="center-loader">
    <Spinner large />
  </div>
);

export const EmptyState: React.FC<{
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ icon: Icon, title, description, action }) => (
  <div className="empty">
    <div className="empty-icon">
      <Icon />
    </div>
    <div className="empty-title">{title}</div>
    {description && <div className="empty-desc">{description}</div>}
    {action}
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <EmptyState
    icon={AlertCircle}
    title="Couldn't load this data"
    description={message}
    action={
      onRetry && (
        <button className="btn btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )
    }
  />
);

export const Alert: React.FC<{ kind?: 'danger' | 'warning' | 'info'; children: React.ReactNode }> = ({
  kind = 'danger',
  children,
}) => (
  <div className={`alert alert-${kind}`} role="alert">
    <AlertCircle />
    <div>{children}</div>
  </div>
);

export const SkeletonRows: React.FC<{ rows?: number; cols: number }> = ({ rows = 5, cols }) => (
  <>
    {Array.from({ length: rows }, (_, r) => (
      <tr key={r}>
        {Array.from({ length: cols }, (_, c) => (
          <td key={c}>
            <div className="skeleton" style={{ height: 14, width: c === 0 ? '70%' : '50%' }} />
          </td>
        ))}
      </tr>
    ))}
  </>
);
