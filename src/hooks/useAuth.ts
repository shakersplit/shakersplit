import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Sentinel error thrown by signUpWithEmail when the email already belongs to a confirmed user.
 * The UI catches this and switches into "user exists" mode instead of showing a raw error.
 */
export class UserAlreadyExistsError extends Error {
  constructor(public email: string) {
    super(`An account with ${email} already exists.`);
    this.name = 'UserAlreadyExistsError';
  }
}

export function useAuth() {
  const { user, session, isLoading, setSession, setLoading } = useAuthStore();

  useEffect(() => {
    // Coordinate isLoading=false between two sources: the initial getSession() AND the first
    // onAuthStateChange event. Either may fire first; clear isLoading on whichever comes
    // second to avoid a brief flash of authenticated state during sign-out / page-load races.
    let initialCheckDone = false;
    let firstEventReceived = false;

    const tryClearLoading = () => {
      if (initialCheckDone && firstEventReceived) setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      initialCheckDone = true;
      tryClearLoading();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      firstEventReceived = true;
      tryClearLoading();
    });

    return () => subscription.unsubscribe();
  }, [setSession, setLoading]);

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  /**
   * Detects three signup outcomes:
   *  - new email → row created, confirmation email sent → returns normally
   *  - existing-confirmed email → Supabase returns user with empty identities[] (silent dedup
   *    to prevent enumeration). Throw UserAlreadyExistsError so the UI can prompt sign-in.
   *  - existing-unconfirmed email → Supabase resends confirmation email → returns normally,
   *    UI shows "check your email" again.
   */
  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${window.location.origin}/app`,
      },
    });
    if (error) throw error;

    // Detect already-confirmed user via empty identities array (Supabase Auth >= 2024 behavior).
    // See: https://supabase.com/docs/reference/javascript/auth-signup
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new UserAlreadyExistsError(email);
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (error) throw error;
  };

  /**
   * Send a password reset email. Supabase always returns success even for non-existent emails
   * (anti-enumeration), so we surface a generic "if an account exists" message in the UI.
   */
  const sendPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw error;
  };

  /**
   * Update the password for the user whose recovery session is currently active.
   * Called from /auth/reset-password after the user lands from the recovery email link.
   */
  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!session,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    sendPasswordReset,
    updatePassword,
    signOut,
  };
}
