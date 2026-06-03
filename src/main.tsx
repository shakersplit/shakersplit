import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/globals.css';

// Apply persisted theme before first render to avoid flash
const stored = localStorage.getItem('shakersplit-theme');
const theme = stored ? (JSON.parse(stored)?.state?.theme ?? 'dark') : 'dark';
document.documentElement.classList.add(theme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
