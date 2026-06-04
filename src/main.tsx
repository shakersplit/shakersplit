import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/globals.css';
// Side-effect import: subscribes a module-level listener to supabase.auth so we capture
// SIGNED_IN events that fire during URL-hash processing (OAuth callback, magic link, email
// confirm) BEFORE the React tree mounts. Required for the post-sign-in notification prompt
// to fire on those flows — see src/lib/auth-events.ts for the full rationale.
import './lib/auth-events';

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
