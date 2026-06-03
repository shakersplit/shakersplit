import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/globals.css';

// Apply persisted theme before first render to avoid flash. Strip both classes from the
// SSR/HTML default so we never end up with both `dark` and `light` set simultaneously.
const stored = localStorage.getItem('shakersplit-theme');
const theme = stored ? (JSON.parse(stored)?.state?.theme ?? 'dark') : 'dark';
document.documentElement.classList.remove('dark', 'light');
document.documentElement.classList.add(theme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
