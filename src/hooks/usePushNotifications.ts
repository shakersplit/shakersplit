import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import type { ApiResponse } from '@/types';

export type PushPermissionState =
  | 'unsupported'    // browser doesn't support Web Push (Safari < 16.4 in a tab, etc.)
  | 'unsupported-ios' // iOS Safari outside an installed PWA
  | 'default'        // user hasn't decided yet
  | 'granted'        // permission granted, may or may not have an active subscription
  | 'denied';        // user clicked "Don't allow" — recoverable only via OS settings

export interface PushDevice {
  id: string;
  user_agent: string | null;
  created_at: string;
  last_used_at: string;
}

const PUBLIC_VAPID_KEY: string | undefined = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

/**
 * Web Push lifecycle hook. Encapsulates:
 *   - capability detection (handles iOS-without-installed-PWA correctly)
 *   - permission request
 *   - subscription create / restore / delete
 *   - device list refresh
 *   - test push trigger
 *
 * Web Push works on:
 *   - Chrome/Edge/Firefox/Samsung Internet on Android, desktop, ChromeOS — always
 *   - Safari 16.4+ on macOS — always
 *   - Safari on iOS 16.4+ — ONLY when the PWA is installed via "Add to Home Screen"
 *     and the user opens it from the home-screen icon (display: standalone). In a
 *     normal Safari tab, Notification.permission throws / is unavailable — we detect
 *     this and surface 'unsupported-ios' so the UI can prompt the user to install.
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<PushPermissionState>('default');
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [devices, setDevices] = useState<PushDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // True once the async serviceWorker.ready chain has settled — until then, `endpoint` is
  // necessarily `null` and consumers can't reliably tell "no subscription" from "still
  // checking". The post-sign-in prompt uses this to avoid a false-positive show.
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);

  // 1. Detect capability + current permission state once on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    if (!supported) {
      // iOS Safari in a tab returns false here. Distinguish by checking iOS UA.
      const ua = navigator.userAgent;
      if (/iP(hone|ad|od)/.test(ua) && !window.matchMedia('(display-mode: standalone)').matches) {
        setPermission('unsupported-ios');
      } else {
        setPermission('unsupported');
      }
      // No SW = nothing to load. Mark loaded immediately so consumers don't hang.
      setSubscriptionLoaded(true);
      return;
    }

    setPermission(Notification.permission as PushPermissionState);

    // Restore current subscription state if there is one.
    void navigator.serviceWorker.ready
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        if (sub) setEndpoint(sub.endpoint);
      })
      .catch((err) => {
        // SW registration failed (private mode, content blockers, etc.) — surface no
        // subscription rather than hanging the consumer.
        console.warn('[push] serviceWorker.ready failed', err);
      })
      .finally(() => setSubscriptionLoaded(true));
  }, []);

  // 2. List subscribed devices for this account.
  const refreshDevices = useCallback(async () => {
    try {
      const res = await apiClient<ApiResponse<PushDevice[]>>('/users/me', {
        params: { action: 'push-subscriptions' },
      });
      setDevices(res.data ?? []);
    } catch (err) {
      console.error('refresh devices failed', err);
    }
  }, []);

  useEffect(() => {
    if (permission === 'granted') void refreshDevices();
  }, [permission, refreshDevices]);

  // 3. Subscribe — request permission, create push subscription, send to backend.
  const subscribe = useCallback(async () => {
    setError(null);
    if (!PUBLIC_VAPID_KEY) {
      setError('Push not configured on this server.');
      return false;
    }
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PushPermissionState);
      if (result !== 'granted') {
        setError(result === 'denied' ? 'Permission denied. Enable notifications in your browser settings.' : 'Permission not granted.');
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      // Track whether WE created the subscription on this call so we can roll back on a
      // server-persist failure. If the subscription already existed, leave it alone.
      let createdHere = false;
      if (!sub) {
        // applicationServerKey wants ArrayBuffer (or string). Cast through ArrayBuffer to
        // satisfy strict TS lib types — the runtime accepts any TypedArray with a backing buffer.
        const keyBytes = urlBase64ToUint8Array(PUBLIC_VAPID_KEY);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes.buffer as ArrayBuffer,
        });
        createdHere = true;
      }

      const json = sub.toJSON();
      try {
        await apiClient('/users/me', {
          method: 'POST',
          params: { action: 'push-subscribe' },
          body: {
            endpoint: json.endpoint,
            keys: json.keys,
            user_agent: navigator.userAgent,
          },
        });
      } catch (serverErr) {
        // Server didn't accept the subscription. If we created the local subscription on
        // this call, roll it back so we don't leave an orphan PushSubscription that has no
        // server-side row — that would silently suppress any future enable-prompt UI
        // because the next mount would see isSubscribed=true with no way for the server to
        // actually deliver a push to it.
        if (createdHere) {
          try { await sub.unsubscribe(); } catch { /* best-effort */ }
        }
        throw serverErr;
      }

      setEndpoint(sub.endpoint);
      await refreshDevices();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshDevices]);

  // 4. Unsubscribe — remove the local subscription + tell the server.
  const unsubscribe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        try {
          await apiClient('/users/me', {
            method: 'POST',
            params: { action: 'push-unsubscribe' },
            body: { endpoint: sub.endpoint },
          });
        } catch (err) {
          // Don't block local unsubscribe if the server call fails.
          console.error('server unsubscribe failed', err);
        }
        await sub.unsubscribe();
      }
      setEndpoint(null);
      await refreshDevices();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshDevices]);

  // 5. Send a test push to every device this user has.
  const sendTest = useCallback(async () => {
    setError(null);
    try {
      await apiClient('/users/me', { method: 'POST', params: { action: 'push-test' } });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test send failed.');
      return false;
    }
  }, []);

  return {
    permission,
    isSubscribed: !!endpoint,
    subscriptionLoaded,
    devices,
    loading,
    error,
    subscribe,
    unsubscribe,
    sendTest,
    refreshDevices,
  };
}

/**
 * Convert the URL-safe base64 VAPID public key into the Uint8Array that PushManager.subscribe()
 * requires. Browser-native atob handles plain base64; we pad and translate the URL-safe alphabet.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
