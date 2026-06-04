import { useEffect } from 'react';

/**
 * Listens for messages from the service worker and acts on them.
 *
 * The only message we currently handle is NAVIGATE — the SW posts this from its
 * `notificationclick` listener when it focuses an existing tab but can't call `client.navigate`
 * itself (Safari and a few older browsers expose WindowClient without a usable `navigate`
 * method). In that case, the notification tap focuses the tab and we finish the deep-link
 * here in app code.
 *
 * Using `window.location.assign` instead of react-router's `useNavigate` is intentional:
 *  - This component lives outside the RouterProvider tree (it's mounted in App.tsx alongside
 *    UpdateToast), so the navigate hook isn't available here.
 *  - A notification tap is a coarse-grained navigation — full route + reload is cheap and
 *    ensures fresh data, which matches user expectation when arriving from a notification.
 */
export function SwNavigationBridge() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | null;
      if (data?.type === 'NAVIGATE' && typeof data.url === 'string') {
        // Same-origin guard — the SW only ever sends app paths, but defense in depth is cheap.
        try {
          const target = new URL(data.url, window.location.origin);
          if (target.origin !== window.location.origin) return;
          window.location.assign(target.pathname + target.search + target.hash);
        } catch {
          // Malformed URL — ignore.
        }
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  return null;
}
