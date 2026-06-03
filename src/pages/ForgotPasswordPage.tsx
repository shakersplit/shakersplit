import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

/**
 * Stand-alone "Forgot password?" entry point. Calls supabase.auth.resetPasswordForEmail and
 * always shows the same success message to avoid leaking which emails have accounts.
 */
export function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setSubmitted(true);
    } catch (err) {
      // Even on error we show the same generic success message to avoid email enumeration.
      // Log to console for debugging, but don't leak to the user that the email was rejected.
      console.error('password reset request error:', err);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-food/15">
            <CheckCircle2 className="h-9 w-9 text-food" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Check your email</h2>
            <p className="mt-2 text-muted-foreground text-sm">
              If an account exists for <span className="font-medium text-foreground">{email}</span>,
              you'll receive a password reset link in the next minute.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-left text-sm text-muted-foreground">
            <p className="text-foreground font-medium mb-1">Didn't get it?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Check your spam folder</li>
              <li>The link expires in 24 hours</li>
              <li>Make sure you typed the address correctly</li>
            </ul>
          </div>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We'll email you a link to set a new one.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Generic error block kept for future use; reset request never throws to user. */}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <Link
          to="/auth"
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </div>
    </div>
  );
}
