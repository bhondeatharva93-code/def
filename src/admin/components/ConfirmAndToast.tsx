import React from 'react';

export interface ToastItem {
  id: number;
  message: string;
  tone?: 'success' | 'error';
}

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  if (!toasts.length) return null;
  return (
    <div className="cg-toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`cg-toast${t.tone === 'error' ? ' cg-toast--error' : ''}`}
        >
          <span>{t.message}</span>
          <button
            type="button"
            className="cg-btn cg-btn--sm"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss message"
          >
            Close
          </button>
        </div>
      ))}
    </div>
  );
}

export interface ConfirmState {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmDialog({
  state,
  busy,
  onClose,
}: {
  state: ConfirmState | null;
  busy: boolean;
  onClose: () => void;
}) {
  if (!state) return null;
  return (
    <div className="cg-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="cg-confirm-title">
      <div className="cg-modal cg-modal--sm">
        <h2 id="cg-confirm-title">{state.title}</h2>
        <p>{state.message}</p>
        <div className="cg-modal__actions">
          <button type="button" className="cg-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`cg-btn ${state.danger ? 'cg-btn--danger' : 'cg-btn--primary'}`}
            disabled={busy}
            onClick={async () => {
              await state.onConfirm();
            }}
          >
            {busy ? 'Please wait...' : state.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
