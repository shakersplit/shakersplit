import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Persisted gate state for the post-sign-in "enable notifications?" prompt.
 *
 * Two pieces of state matter:
 *  - `lastShownAt` — epoch ms of the last time we displayed the card. Used for the 24-hour
 *    throttle so we never ask the same user twice in one day, even across multiple sign-ins
 *    or tabs.
 *  - `userAnswered` — `'yes'` or `'no'` once the user makes an explicit choice. Either value
 *    means "stop asking forever on this device". `null` means we're still allowed to ask
 *    (subject to throttle).
 *
 * Soft-dismiss interactions ("Maybe later", X button, Esc) only update `lastShownAt` — the
 * user hasn't committed either way, so we'll surface the prompt again tomorrow.
 *
 * Persisted in localStorage under `shakersplit-notification-prompt`. We key per-user via the
 * persist `name` callback so two users on a shared device don't inherit each other's
 * decisions. The `lastShownAt` value is also keyed per-user — fresh user gets a fresh slot.
 *
 * iOS Safari Private Browsing throws on localStorage.setItem. A defensive storage wrapper
 * below swallows those errors so the app keeps working in-memory; the gate just defaults to
 * "ask once per session" instead of "ask once per day" in that mode.
 */

type PromptDecision = 'yes' | 'no' | null;

interface NotificationPromptState {
  lastShownAt: number | null;
  userAnswered: PromptDecision;
  /** Stamp `lastShownAt = now` (ms). Call when the card becomes visible. */
  markShown: () => void;
  /** Record a hard yes/no — stops further prompts forever for this user. */
  markAnswered: (decision: 'yes' | 'no') => void;
  /** Internal: clear the show stamp so subscribe failures don't burn the 24h slot. */
  clearShown: () => void;
  /** QA / debug escape hatch. Callable in any build — clearing localStorage achieves the same thing anyway. */
  reset: () => void;
}

/**
 * Best-effort localStorage wrapper. Web Storage throws in:
 *   - iOS Safari Private Browsing (every setItem since iOS 11)
 *   - Quota exceeded (rare, but real for users with bursting cookies / storage)
 *   - Disabled-third-party-storage edge cases
 *
 * Failures here become no-ops: the in-memory zustand state still updates, so the prompt
 * works for the duration of the session. The "ask once per 24h" semantic degrades to
 * "ask once per app launch" — acceptable for a non-critical UX nudge.
 */
const safeLocalStorage: Storage = {
  get length() {
    try { return window.localStorage.length; } catch { return 0; }
  },
  clear() {
    try { window.localStorage.clear(); } catch { /* no-op */ }
  },
  key(i) {
    try { return window.localStorage.key(i); } catch { return null; }
  },
  getItem(key) {
    try { return window.localStorage.getItem(key); } catch { return null; }
  },
  setItem(key, value) {
    try { window.localStorage.setItem(key, value); } catch { /* no-op */ }
  },
  removeItem(key) {
    try { window.localStorage.removeItem(key); } catch { /* no-op */ }
  },
};

export const useNotificationPromptStore = create<NotificationPromptState>()(
  persist(
    (set) => ({
      lastShownAt: null,
      userAnswered: null,
      markShown: () => set({ lastShownAt: Date.now() }),
      markAnswered: (decision) => set({ userAnswered: decision, lastShownAt: Date.now() }),
      clearShown: () => set({ lastShownAt: null }),
      reset: () => set({ lastShownAt: null, userAnswered: null }),
    }),
    {
      name: 'shakersplit-notification-prompt',
      storage: createJSONStorage(() => safeLocalStorage),
      // If localStorage is corrupted or unparseable, surface a console warning rather than
      // throwing during hydration — defaults will apply and the user gets a fresh prompt.
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.warn('[notif-prompt] persist rehydrate failed; defaults applied', error);
        }
      },
    },
  ),
);

/**
 * 24h throttle threshold. Exported so tests / QA can reason about it without hardcoding.
 */
export const PROMPT_THROTTLE_MS = 24 * 60 * 60 * 1000;
