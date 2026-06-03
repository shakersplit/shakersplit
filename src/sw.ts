/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

/**
 * ShakerSplit service worker — combines two roles:
 *
 *  1. PRECACHE / OFFLINE — Workbox injects the build manifest into self.__WB_MANIFEST and
 *     precacheAndRoute() makes every shipped asset available offline. We also add a tiny
 *     runtime cache for Supabase REST so the app shell stays usable on flaky networks.
 *
 *  2. WEB PUSH — handles 'push' events (notifications from our backend) and 'notificationclick'
 *     events (deep-link the user to the right page when they tap a notification).
 *
 * Installed via vite-plugin-pwa's injectManifest strategy. The UpdateToast component in the
 * app handles user-visible "new version available" prompts when this file changes.
 */
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope;

// 1. Precache everything Vite ships us — html, css, js, woff2, icons.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// 2. Navigation fallback so the SPA always loads when offline.
const navigationHandler = new NetworkFirst({
  cacheName: 'navigation-cache',
  networkTimeoutSeconds: 3,
});
registerRoute(new NavigationRoute(navigationHandler, { denylist: [/^\/api\//] }));

// 3. Supabase REST: short-lived NetworkFirst so writes always hit the server, but reads can
// come from cache for ~5 minutes when offline.
registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/v1/'),
  new NetworkFirst({
    cacheName: 'supabase-api-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 300 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// 4. Photos bucket — long cache, immutable (paths embed UUIDs).
registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co') && url.pathname.includes('/storage/v1/object/public/photos/'),
  new CacheFirst({
    cacheName: 'photos-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }), // 30 days
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// 5. Fonts — Google Fonts. SWR.
registerRoute(
  ({ url }) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
  new StaleWhileRevalidate({ cacheName: 'fonts-cache' }),
);

// ────────────────────────────────────────────────────────────────────────────
// SKIP-WAITING flow.
// We intentionally do NOT call self.skipWaiting() in 'install' — that would hot-swap
// the SW the moment the new bundle finishes downloading, breaking any open tabs that
// expect the old code. Instead, the UpdateToast component sends us a SKIP_WAITING
// message when the user clicks "Update now", and we activate at that moment.
// ────────────────────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ────────────────────────────────────────────────────────────────────────────
// WEB PUSH — receive a push event from our backend, show a notification.
// Payload format (sent from /api/push/send):
//   { title: string, body: string, url?: string, icon?: string, tag?: string, data?: object }
// ────────────────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload: {
    title?: string;
    body?: string;
    url?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, unknown>;
  } = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'ShakerSplit', body: event.data.text() };
  }

  const title = payload.title ?? 'ShakerSplit';
  const options: NotificationOptions = {
    body: payload.body ?? '',
    icon: payload.icon ?? '/icons/icon-192x192.png',
    badge: payload.badge ?? '/icons/icon-192x192.png',
    tag: payload.tag, // dedupes same-tag notifications
    data: { url: payload.url ?? '/app', ...(payload.data ?? {}) },
    // requireInteraction would keep the notification visible until tapped — too aggressive
    // for our use case; iOS Web Push ignores this anyway.
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data?.url as string | undefined) ?? '/app';

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // If a tab is already open, focus it and route to the deep link.
      for (const client of all) {
        // matchAll returns Client objects; cast to WindowClient for navigate/focus support.
        const wc = client as WindowClient;
        if ('focus' in wc) {
          await wc.focus();
          if ('navigate' in wc && typeof wc.navigate === 'function') {
            await wc.navigate(url);
          } else {
            wc.postMessage({ type: 'NAVIGATE', url });
          }
          return;
        }
      }
      // Otherwise open a new window.
      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })(),
  );
});
