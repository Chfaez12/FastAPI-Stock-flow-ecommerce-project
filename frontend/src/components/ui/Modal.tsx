import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'modal' | 'drawer';
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  variant = 'modal',
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const panelClass = variant === 'drawer' ? 'drawer' : `modal modal-${size}`;

  return createPortal(
    <div
      className={`overlay ${variant === 'drawer' ? 'drawer-overlay' : ''}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={panelClass} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{title}</h2>
            {description && <p className="modal-desc">{description}</p>}
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        {children && <div className="modal-body">{children}</div>}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};
