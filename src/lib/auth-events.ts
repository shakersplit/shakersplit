import { supabase } from '@/lib/supabase';
import { useNotificationPromptStore } from '@/stores/notificationPrompt.store';

/**
 * Module-level capture of the most recent "real sign-in" event.
 *
 * Why a singleton, not a hook: Supabase's `onAuthStateChange` only replays
 * `INITIAL_SESSION` to late subscribers — it does NOT replay historical `SIGNED_IN`
 * events. For OAuth and magic-link flows, the SIGNED_IN event fires synchronously when
 * `detectSessionInUrl: true` parses the URL hash on first page load. By that point,
 * AuthGuard is still rendering its loading spinner, so anything inside the router tree
 * (RootLayout, NotificationPermissionPrompt) hasn't mounted yet — the SIGNED_IN window
 * closes before the React component can subscribe.
 *
 * Solution: register a single supabase listener at module-scope, BEFORE the React tree
 * mounts. The listener writes to a tiny pub/sub here. The prompt component subscribes via
 * `subscribeSignedIn` and gets:
 *   - any SIGNED_IN event that fires while the React tree mounts (because it's already
 *     captured in the singleton's last-event timestamp), AND
 *   - all subsequent SIGNED_IN events (live).
 *
 * `INITIAL_SESSION` and `TOKEN_REFRESHED` are explicitly NOT counted as sign-in
 * transitions — the prompt should fire only on a real authentication action, not on
 * cached-session restoration or background token rotation.
 *
 * Page reload semantics: when the user reloads the PWA after sign-in, supabase emits
 * INITIAL_SESSION (not SIGNED_IN), so `lastSignedInAt` from the previous session does NOT
 * cause a re-show. We only retain the timestamp through the current page lifetime; on
 * reload, the singleton starts fresh at `null`.
 *
 * On SIGNED_OUT we also reset the notification-prompt store. Without this, signing out
 * and signing in as a different user on a shared browser would inherit the previous
 * user's "No thanks" decision. The prompt store is per-device by design (we don't have a
 * user-id-keyed persist mode), so this is the cleanest way to keep the per-user
 * semantics correct.
 */

let lastSignedInAt: number | null = null;
let lastUserId: string | null = null;
const listeners = new Set<(at: number) => void>();

const { data } = supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    const userId = session?.user?.id ?? null;
    // If a different user just signed in (e.g. user A signed out, user B signed in,
    // potentially without a SIGNED_OUT event in between on the same tab), clear the
    // per-device prompt store so user B gets a fresh ask. Only clears on a genuine user
    // change — same user re-authenticating in the same lifetime preserves their decision.
    if (lastUserId !== null && userId !== null && userId !== lastUserId) {
      useNotificationPromptStore.getState().reset();
    }
    lastUserId = userId;
    lastSignedInAt = Date.now();
    listeners.forEach((fn) => {
      try {
        fn(lastSignedInAt!);
      } catch (err) {
        console.error('[auth-events] subscriber threw', err);
      }
    });
  } else if (event === 'SIGNED_OUT') {
    // Sign-out clears the per-device prompt state so the next user signing in on this
    // browser gets a fresh ask. The current user's decision is gone — this is the correct
    // semantic for a per-device store on a public/shared device.
    useNotificationPromptStore.getState().reset();
    lastUserId = null;
    lastSignedInAt = null;
  } else if (event === 'INITIAL_SESSION') {
    // Track the user id so we can detect a change on the next SIGNED_IN. INITIAL_SESSION
    // doesn't trigger the prompt (page-load restore is not a sign-in transition), but it
    // does establish "who's currently signed in" for the cross-user-detection logic.
    lastUserId = session?.user?.id ?? null;
  }
});

// Module-lifetime subscription — never unsubscribed. The supabase client is itself a
// module-level singleton, so leaking this listener for the page lifetime is intentional.
void data;

/**
 * Subscribe to SIGNED_IN events. Calls `fn` immediately if a SIGNED_IN already fired
 * during the current page lifetime (catching the OAuth-race window). Returns an
 * unsubscribe function.
 */
export function subscribeSignedIn(fn: (at: number) => void): () => void {
  listeners.add(fn);
  if (lastSignedInAt !== null) {
    // Synchronous replay — the event is "still fresh" within the current page lifetime.
    // The subscriber is responsible for de-duping if it cares (we use a per-mount flag in
    // the prompt component).
    try {
      fn(lastSignedInAt);
    } catch (err) {
      console.error('[auth-events] replay subscriber threw', err);
    }
  }
  return () => listeners.delete(fn);
}

/** For the prompt component to detect "did SIGNED_IN already fire by the time I mounted?". */
export function getLastSignedInAt(): number | null {
  return lastSignedInAt;
}
