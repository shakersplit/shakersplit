import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { subscribeSignedIn } from '@/lib/auth-events';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/components/ui/Toast';
import {
  useNotificationPromptStore,
  PROMPT_THROTTLE_MS,
} from '@/stores/notificationPrompt.store';

/**
 * One-shot post-sign-in "enable notifications?" prompt.
 *
 * Shows a fixed-position card after the user signs in or completes sign-up, but ONLY if all
 * of these are true:
 *
 *   1. The app is running in standalone mode (installed to home screen / launched from the
 *      home-screen icon). Browser tabs never see the prompt — there's no point asking for
 *      push permission in a tab the user might close in five seconds.
 *   2. The user hasn't already given a hard yes/no on this device.
 *   3. We haven't shown the prompt in the last 24 hours.
 *   4. `Notification.permission` is in the only recoverable state, `'default'`. Once the
 *      browser has a `'granted'` or `'denied'` decision, asking again is either redundant
 *      or counterproductive (the user has to go to OS settings to flip a deny).
 *   5. There's no existing push subscription on this device.
 *
 * Trigger source: a module-level singleton in `lib/auth-events.ts` listens for
 * `SIGNED_IN` from supabase. The singleton is registered at app boot (before any router
 * rendering), so it captures events that fire during URL-hash processing on OAuth /
 * magic-link flows — events that would otherwise be missed by a component-level listener
 * because RootLayout doesn't mount until AuthGuard resolves the session.
 *
 * Page reloads emit `INITIAL_SESSION`, not `SIGNED_IN`, so the prompt does NOT re-fire on
 * every reopen of the PWA — only on actual authentication transitions.
 *
 * Mounted in `RootLayout`, which is itself wrapped in `<AuthGuard>` — so this component
 * only ever renders for authenticated users on `/app/*` routes.
 */
export function NotificationPermissionPrompt() {
  const {
    permission,
    isSubscribed,
    subscriptionLoaded,
    subscribe,
    loading,
  } = usePushNotifications();
  const { lastShownAt, userAnswered, markShown, markAnswered, clearShown } =
    useNotificationPromptStore();
  const toast = useToast();

  const [visible, setVisible] = useState(false);
  // Tracks SIGNED_IN within this mount lifetime. Reset to false after the gate either passes
  // (consumed → card shown) OR after we've evaluated the gate enough times to trust that
  // none of the inputs will change again. We don't reset on bail conditions because the
  // gate effect's dependencies will re-run it when the relevant input does flip.
  const [signedInThisSession, setSignedInThisSession] = useState(false);

  // ── 1. Subscribe to module-level SIGNED_IN bus ─────────────────────────────
  // Calling subscribe replays a SIGNED_IN that already happened during the current page
  // lifetime (catching the OAuth-callback race). The dedup happens at the gate level via
  // `lastShownAt` + `userAnswered`, not here, so a double-fire is harmless.
  useEffect(() => {
    const unsubscribe = subscribeSignedIn(() => setSignedInThisSession(true));
    return unsubscribe;
  }, []);

  // ── 2. Standalone-mode detection (reactive) ────────────────────────────────
  // Using state with a matchMedia change listener so a user who installs mid-session and
  // signs in again gets the prompt. iOS Safari's `navigator.standalone` doesn't change
  // mid-session anyway, so we only need to listen to display-mode changes.
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const mediaMatch = window.matchMedia('(display-mode: standalone)').matches;
    const iosMatch =
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    return mediaMatch || iosMatch;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(display-mode: standalone)');
    const handler = (e: MediaQueryListEvent) => {
      const iosMatch =
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsStandalone(e.matches || iosMatch);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // ── 3. Gate evaluation ─────────────────────────────────────────────────────
  // Effect re-runs whenever any input could flip a gate. Each gate has a short-circuit
  // comment so future maintainers can find the failing condition fast.
  // Refs are used for actions to avoid effect re-runs on store-action identity (zustand
  // returns stable refs, but TS-level dep correctness wants them tracked).
  const markShownRef = useRef(markShown);
  markShownRef.current = markShown;

  useEffect(() => {
    if (!signedInThisSession) return;            // gate: must be a real sign-in transition
    if (visible) return;                          // gate: already showing
    if (!isStandalone) return;                    // gate: req #1 — only in installed PWA
    if (!subscriptionLoaded) return;              // gate: wait for SW to report subscription state
    if (userAnswered !== null) return;            // gate: req #4 — hard yes/no is forever
    if (permission !== 'default') return;         // gate: req #5 — granted/denied/unsupported are terminal
    if (isSubscribed) return;                     // gate: req #6 — already has a subscription

    // Throttle: 24h rolling window since last show. Guard against backwards-clock-jump
    // (DST glitch, manual time change, NTP correction) by treating a negative delta as
    // stale and proceeding rather than blocking forever.
    if (lastShownAt) {
      const delta = Date.now() - lastShownAt;
      if (delta >= 0 && delta < PROMPT_THROTTLE_MS) return; // gate: req #3 — 24h throttle
    }

    // All gates passed. Show, stamp lastShownAt, and consume the SIGNED_IN flag so the
    // effect doesn't re-fire on TOKEN_REFRESHED or other auth events.
    markShownRef.current();
    setVisible(true);
    setSignedInThisSession(false);
  }, [
    signedInThisSession,
    visible,
    isStandalone,
    subscriptionLoaded,
    userAnswered,
    permission,
    isSubscribed,
    lastShownAt,
  ]);

  // ── 4. Esc closes the card as a soft dismiss. ───────────────────────────────
  const dismissSoft = useCallback(() => setVisible(false), []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissSoft();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, dismissSoft]);

  // ── 5. Action handlers. ─────────────────────────────────────────────────────
  const handleEnable = useCallback(async () => {
    // Pre-check: offline. Avoids a hanging fetch and a confusing failure toast.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      toast.error("You're offline. Try again when you reconnect.");
      return;
    }

    const ok = await subscribe();
    if (ok) {
      markAnswered('yes');
      setVisible(false);
      toast.success("Notifications on. We'll keep it gentle.", {
        action: {
          label: 'Manage',
          onClick: () => {
            window.location.assign('/app/profile');
          },
        },
      });
      return;
    }

    // subscribe() returned false. Two distinct failure shapes — handle each correctly so
    // we don't silently lock the user out OR re-prompt them annoyingly forever.
    const nowDenied =
      typeof Notification !== 'undefined' &&
      Notification.permission === 'denied';

    if (nowDenied) {
      // The user just clicked "Don't allow" in the OS prompt. That's effectively a hard no
      // — and importantly, the gate at line `permission !== 'default'` would suppress us
      // forever anyway, so we record the explicit decision so the state is consistent.
      markAnswered('no');
      setVisible(false);
      toast.info(
        "Notifications blocked. You can change this in your browser/device settings.",
      );
    } else {
      // Network / VAPID / server failure. The user's decision is genuinely "wanted yes,
      // couldn't get there" — don't lock them out. Clear the show stamp so the 24h
      // throttle doesn't burn this slot, then let them retry from Profile or on next
      // sign-in.
      clearShown();
      setVisible(false);
      toast.error(
        "Couldn't enable notifications right now. Try again from Profile → Notifications.",
        {
          action: {
            label: 'Open Profile',
            onClick: () => {
              window.location.assign('/app/profile');
            },
          },
        },
      );
    }
  }, [subscribe, markAnswered, clearShown, toast]);

  const handleNoThanks = useCallback(() => {
    markAnswered('no');
    setVisible(false);
    // Give the user a discoverable recovery path. Without this, "No thanks" feels final
    // and there's no obvious way back if they change their mind in a week.
    toast.info('You can turn notifications on anytime in Profile → Notifications.', {
      action: {
        label: 'Open Profile',
        onClick: () => {
          window.location.assign('/app/profile');
        },
      },
    });
  }, [markAnswered, toast]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="notif-prompt-title"
      aria-describedby="notif-prompt-body"
      // bottom offset accounts for the mobile BottomTabs bar AND the iOS home-indicator
      // safe area. On desktop the BottomTabs aren't rendered, so we drop to bottom-6.
      className="pointer-events-none fixed left-0 right-0 z-[80] flex justify-center px-4 lg:left-auto lg:right-6 lg:justify-end"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)',
      }}
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-2xl backdrop-blur lg:mb-0">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p
              id="notif-prompt-title"
              className="text-sm font-semibold leading-tight"
            >
              Stay on track with reminders
            </p>
            <p
              id="notif-prompt-body"
              className="mt-1 text-xs text-muted-foreground leading-relaxed"
            >
              Gentle nudges for workouts, meals, and weekly check-ins. You can
              change this anytime in Profile.
            </p>
          </div>
          <button
            type="button"
            onClick={dismissSoft}
            // Don't disable the X button while loading — let the user bail out of a
            // hanging subscribe() call. We do disable Yes/No to prevent a double-decision.
            aria-label="Dismiss for now"
            className="-mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleNoThanks}
            disabled={loading}
            className="min-h-[40px] rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            No thanks
          </button>
          <button
            type="button"
            onClick={dismissSoft}
            disabled={loading}
            className="min-h-[40px] rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
          >
            Maybe later
          </button>
          <button
            type="button"
            onClick={handleEnable}
            disabled={loading}
            className="min-h-[40px] rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Enabling…' : 'Enable'}
          </button>
        </div>
      </div>
    </div>
  );
}
