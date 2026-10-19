import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/vazirmatn/wght.css';

import './bootstrap';
import RootApp from './RootApp';
import '../css/app.css';

const root = document.getElementById('app');

if (!root) {
  throw new Error('Root element #app not found');
}

createRoot(root).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);
