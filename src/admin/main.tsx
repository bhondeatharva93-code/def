import React from 'react';
import { createRoot } from 'react-dom/client';
import { AdminApp } from './App';

const container = document.getElementById('admin-root');
if (container) {
  createRoot(container).render(<AdminApp />);
}
