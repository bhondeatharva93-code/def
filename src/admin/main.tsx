import React from 'react';
import { createRoot } from 'react-dom/client';
import { AdminApp } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

const container = document.getElementById('admin-root');
if (container) {
  createRoot(container).render(
    <ErrorBoundary>
      <AdminApp />
    </ErrorBoundary>
  );
}
