import React from 'react';

interface State {
  error: Error | null;
}

function formatErrorMessage(err: Error | unknown): string {
  const raw = err instanceof Error ? err.message : String(err || '');
  try {
    const parsed = JSON.parse(raw) as {
      error?: string;
      operationType?: string;
      path?: string | null;
    };
    if (parsed && parsed.error) {
      const target = parsed.path ? ` (${parsed.operationType || 'read'} ${parsed.path})` : '';
      return `${parsed.error}${target}`;
    }
  } catch {
    // Plain error message
  }
  return raw || 'An unexpected error occurred in the admin panel.';
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[admin-error-boundary]', error, info?.componentStack || '');
  }

  render() {
    if (this.state.error) {
      return (
        <div className="cg-login-page">
          <div className="cg-login-card" role="alert">
            <h1>Something went wrong</h1>
            <div className="cg-alert-error">{formatErrorMessage(this.state.error)}</div>
            <button
              type="button"
              className="cg-google-btn"
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
