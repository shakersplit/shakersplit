import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, CheckCircle2, XCircle, Lock } from 'lucide-react';

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score === 2) return { score, label: 'Fair', color: 'bg-orange-400' };
  if (score === 3) return { score, label: 'Good', color: 'bg-yellow-400' };
  return { score, label: 'Strong', color: 'bg-food' };
}

const RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
];

/**
 * Lands here when the user clicks the recovery link in their email.
 * Supabase auto-establishes a recovery session via the URL hash on page load,
 * so we just expose updateUser({password}) and redirect afterwards.
 *
 * If a user lands here without a recovery session (direct nav, expired link),
 * show a "link is invalid or expired" message with a "request a new link" CTA.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [recoverySession, setRecoverySession] = useState<'pending' | 'ok' | 'invalid'>('pending');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Supabase v2 fires PASSWORD_RECOVERY when it picks up the recovery hash. We listen for it
  // (and also accept any active session, which means the link parsed cleanly).
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'INITIAL_SESSION' && session)) {
        setRecoverySession('ok');
      }
    });
    // After a short grace period, if no event arrived, treat the link as invalid.
    const timeout = setTimeout(() => {
      setRecoverySession((s) => (s === 'pending' ? 'invalid' : s));
    }, 1500);
    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (strength.score < 2) { setError('Please choose a stronger password.'); return; }
    setLoading(true);
    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => navigate('/app', { replace: true }), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (recoverySession === 'pending') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <p className="text-muted-foreground text-sm">Verifying recovery link…</p>
      </div>
    );
  }

  if (recoverySession === 'invalid') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
            <XCircle className="h-9 w-9 text-destructive" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Recovery link expired</h2>
            <p className="mt-2 text-muted-foreground text-sm">
              This password reset link is invalid or has expired (links are good for 24 hours).
              Request a fresh one and try again.
            </p>
          </div>
          <button
            onClick={() => navigate('/auth/forgot-password')}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Request new reset link
          </button>
          <button
            onClick={() => navigate('/auth')}
            className="w-full rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-secondary transition-colors"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-food/15">
            <CheckCircle2 className="h-9 w-9 text-food" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Password updated</h2>
            <p className="mt-2 text-muted-foreground text-sm">Redirecting you to the app…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Set new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a strong password you haven't used before.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">New password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {password.length > 0 && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength.score ? strength.color : 'bg-border'}`} />
                    ))}
                  </div>
                  <span className={`text-xs font-medium ${
                    strength.score <= 1 ? 'text-red-500' :
                    strength.score === 2 ? 'text-orange-400' :
                    strength.score === 3 ? 'text-yellow-400' : 'text-food'
                  }`}>{strength.label}</span>
                </div>
                <div className="space-y-1">
                  {RULES.map(({ label, test }) => (
                    <div key={label} className="flex items-center gap-1.5 text-xs">
                      {test(password) ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-food" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
                      )}
                      <span className={test(password) ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Confirm new password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full rounded-xl border px-3 py-2.5 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                confirmPassword && confirmPassword !== password ? 'border-destructive' : 'border-input'
              }`}
            />
            {confirmPassword && confirmPassword !== password && (
              <p className="mt-1 text-xs text-destructive">Passwords do not match</p>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !!confirmPassword && confirmPassword !== password}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
