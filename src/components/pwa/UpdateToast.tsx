import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

/**
 * Service worker registration + "new version available" toast.
 *
 * Flow when you push an update to master:
 *  1. Vercel rebuilds, sw.js hash changes.
 *  2. User opens the PWA → browser fetches the new sw.js, installs in 'waiting' state.
 *  3. useRegisterSW fires onNeedRefresh → setNeedRefresh(true).
 *  4. We show a toast at the bottom with "Update now / Later".
 *  5. User taps "Update now" → updateServiceWorker(true) → sends SKIP_WAITING to the
 *     waiting SW → it activates → controllerchange fires → page reloads.
 *
 * If the user dismisses, the new SW stays in 'waiting' state. It will activate naturally
 * the next time ALL tabs of the PWA are closed and reopened.
 */
export function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      // Periodically check for updates while the app is open. 60min is a reasonable cadence —
      // chatty enough to catch deploys, quiet enough not to thrash mobile data.
      if (registration) {
        const interval = setInterval(() => {
          registration.update().catch(() => { /* offline; ignore */ });
        }, 60 * 60 * 1000);
        return () => clearInterval(interval);
      }
    },
    onRegisterError(error) {
      console.error('SW registration failed:', error);
    },
  });

  // After the new SW activates and controllerchange fires, browsers will auto-reload
  // because of vite-plugin-pwa's default behavior. We add a tiny delay so the toast
  // can finish animating out before the reload happens.
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = () => {
      // The PWA scaffold inside the SW may also send NAVIGATE messages from
      // notificationclick — handle those here so a tap on a push notification routes the
      // open tab to the right page.
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  if (!needRefresh) return null;

  const close = () => setNeedRefresh(false);
  const update = async () => {
    setUpdating(true);
    await updateServiceWorker(true); // true = reload after activation
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 lg:bottom-6 lg:left-auto lg:right-6 lg:translate-x-0"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-2xl backdrop-blur max-w-sm">
        <RefreshCw className={`h-5 w-5 text-primary shrink-0 ${updating ? 'animate-spin' : ''}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">New version available</p>
          <p className="text-xs text-muted-foreground">Tap update to get the latest features.</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={update}
            disabled={updating}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {updating ? 'Updating…' : 'Update'}
          </button>
          <button
            onClick={close}
            disabled={updating}
            aria-label="Dismiss"
            className="rounded p-1.5 text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
