import React, { useState } from 'react';
import { Modal } from './Modal';
import { Spinner } from './Feedback';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onClose,
}) => {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Callers report the error; keep the dialog open so the user can retry.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      description={message}
      size="sm"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy && <Spinner />}
            {confirmLabel}
          </button>
        </>
      }
    />
  );
};
