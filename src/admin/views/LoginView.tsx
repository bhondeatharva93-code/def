import React, { useState } from 'react';
import { signInAdminWithGoogle } from '../../data/adminApi';

interface LoginViewProps {
  externalError?: string;
}

export function LoginView({ externalError }: LoginViewProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const displayError = error || externalError || '';

  const handleSignIn = async () => {
    setBusy(true);
    setError('');
    try {
      await signInAdminWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cg-login-page">
      <div className="cg-login-card">
        <div className="cg-login-brand">
          <div className="cg-brand-mark" aria-hidden="true">CG</div>
          <div>
            <h1>Computer Galaxy Admin</h1>
            <p>Catalog &amp; Custom PC Builder Manager</p>
          </div>
        </div>

        <p className="cg-login-copy">
          Sign in with an authorized Google account to manage products, prices, stock, and custom PC builder parts.
        </p>

        {displayError && (
          <div className="cg-alert-error" role="alert">
            {displayError}
          </div>
        )}

        <button
          type="button"
          className="cg-google-btn"
          disabled={busy}
          onClick={() => void handleSignIn()}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#141108"
              d="M21.8 12.23c0-.68-.06-1.34-.18-1.97H12v3.73h5.49a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.05-4.4 3.05-7.4Z"
            />
            <path
              fill="#141108"
              d="M12 22c2.75 0 5.06-.91 6.75-2.47l-3.3-2.56c-.91.61-2.08.98-3.45.98-2.65 0-4.9-1.79-5.7-4.2H2.89v2.64A10 10 0 0 0 12 22Z"
            />
            <path
              fill="#141108"
              d="M6.3 13.75A6.01 6.01 0 0 1 6 12c0-.61.11-1.2.3-1.75V7.61H2.89A10 10 0 0 0 2 12c0 1.61.39 3.14 1.07 4.39l3.23-2.64Z"
            />
            <path
              fill="#141108"
              d="M12 6.05c1.5 0 2.84.51 3.9 1.53l2.92-2.92C17.05 2.99 14.74 2 12 2A10 10 0 0 0 2.89 7.61l3.41 2.64c.8-2.41 3.05-4.2 5.7-4.2Z"
            />
          </svg>
          <span>{busy ? 'Signing in...' : 'Sign in with Google'}</span>
        </button>

        <div className="cg-login-foot">
          <span>Restricted access</span>
          <a href="/">Back to store</a>
        </div>
      </div>
    </div>
  );
}
