import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth, UserAlreadyExistsError } from '@/hooks/useAuth';
import { Eye, EyeOff, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandMark';

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

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
];

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get('signup') === 'true');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  // When sign-up hits an already-existing email, we surface a friendly screen instead of a raw error.
  const [emailAlreadyExists, setEmailAlreadyExists] = useState<string | null>(null);

  const { signInWithEmail, signUpWithEmail, signInWithGoogle, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Already signed in? Bounce to /app, NOT /. Sending to / would loop because the homepage
    // also has Sign in / Sign up CTAs that point straight back to /auth.
    if (isAuthenticated) navigate('/app', { replace: true });
  }, [isAuthenticated, navigate]);

  const strength = getPasswordStrength(password);

  const switchMode = (toSignUp: boolean) => {
    setIsSignUp(toSignUp);
    setError('');
    setSignUpSuccess(false);
    setEmailAlreadyExists(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailAlreadyExists(null);

    if (isSignUp) {
      if (!displayName.trim()) { setError('Please enter a display name.'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
      if (strength.score < 2) { setError('Please choose a stronger password.'); return; }
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, displayName.trim());
        setSignUpSuccess(true);
      } else {
        await signInWithEmail(email, password);
        navigate('/app');
      }
    } catch (err) {
      // Special case: email already registered → show the dedicated screen, not a raw error.
      if (err instanceof UserAlreadyExistsError) {
        setEmailAlreadyExists(err.email);
      } else {
        // Map Supabase's "Invalid login credentials" to something friendlier on sign-in.
        const msg = err instanceof Error ? err.message : 'Authentication failed';
        setError(
          msg === 'Invalid login credentials'
            ? "Email or password doesn't match. Try again or reset your password."
            : msg
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    }
  };

  // Email already exists — friendly recovery screen
  if (emailAlreadyExists) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
            <AlertCircle className="h-9 w-9 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">You already have an account</h2>
            <p className="mt-2 text-muted-foreground text-sm">
              <span className="font-medium text-foreground">{emailAlreadyExists}</span> is already
              registered. Sign in instead, or reset your password if you've forgotten it.
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => {
                setEmailAlreadyExists(null);
                setIsSignUp(false);
                setPassword('');
                setConfirmPassword('');
                setDisplayName('');
              }}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sign in to {emailAlreadyExists}
            </button>
            <Link
              to={`/auth/forgot-password?email=${encodeURIComponent(emailAlreadyExists)}`}
              className="block w-full rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-secondary transition-colors"
            >
              Forgot your password?
            </Link>
          </div>
          <button
            onClick={() => {
              setEmailAlreadyExists(null);
              setEmail('');
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  // Post sign-up confirmation screen
  if (signUpSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-food/15">
            <CheckCircle2 className="h-9 w-9 text-food" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Check your email</h2>
            <p className="mt-2 text-muted-foreground">
              We sent a confirmation link to{' '}
              <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-left space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Next steps</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open the email from ShakerSplit</li>
              <li>Click <span className="text-primary">Confirm your email</span></li>
              <li>You'll be redirected back here to sign in</li>
            </ol>
          </div>
          <p className="text-sm text-muted-foreground">
            Didn't get it? Check your spam folder, or{' '}
            <button
              onClick={() => setSignUpSuccess(false)}
              className="font-medium text-primary hover:underline"
            >
              try again
            </button>
            .
          </p>
          <button
            onClick={() => switchMode(false)}
            className="w-full rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-secondary transition-colors"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-card border-r border-border p-12">
        <Link to="/" className="flex items-center gap-2.5">
          <BrandMark className="h-8 w-8" withBackground />
          <span className="text-xl font-extrabold tracking-tight">Shaker<span className="text-food">Split</span></span>
        </Link>
        <div className="space-y-4">
          <h2 className="text-3xl font-bold leading-tight">
            Track food, gains,<br />
            <span className="bg-gradient-to-r from-food via-workout to-alcohol bg-clip-text text-transparent">
              and the nights out.
            </span>
          </h2>
          <p className="text-muted-foreground">
            One app for everything — gym, meals, drinks. Free forever.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">© 2026 ShakerSplit · $0/month</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <BrandMark className="h-8 w-8" withBackground />
              <span className="text-2xl font-extrabold tracking-tight">Shaker<span className="text-food">Split</span></span>
            </Link>
          </div>

          <div>
            <h1 className="text-2xl font-bold">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isSignUp
                ? 'Free forever. No credit card.'
                : 'Sign in to continue tracking.'}
            </p>
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-input bg-card px-4 py-2.5 text-sm font-medium hover:bg-secondary transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Display Name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium">Password</label>
                {!isSignUp && (
                  <Link
                    to="/auth/forgot-password"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
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

              {/* Password strength — only on sign up */}
              {isSignUp && password.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            i <= strength.score ? strength.color : 'bg-border'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-xs font-medium ${
                      strength.score <= 1 ? 'text-red-500' :
                      strength.score === 2 ? 'text-orange-400' :
                      strength.score === 3 ? 'text-yellow-400' : 'text-food'
                    }`}>{strength.label}</span>
                  </div>
                  <div className="space-y-1">
                    {PASSWORD_RULES.map(({ label, test }) => (
                      <div key={label} className="flex items-center gap-1.5 text-xs">
                        {test(password) ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-food" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
                        )}
                        <span className={test(password) ? 'text-foreground' : 'text-muted-foreground'}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isSignUp && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full rounded-xl border px-3 py-2.5 pr-10 text-sm bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-destructive'
                        : 'border-input'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="mt-1 text-xs text-destructive">Passwords do not match</p>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (isSignUp && confirmPassword.length > 0 && confirmPassword !== password)}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading
                ? isSignUp ? 'Creating account…' : 'Signing in…'
                : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => switchMode(!isSignUp)}
              className="font-medium text-primary hover:underline"
            >
              {isSignUp ? 'Sign in' : 'Sign up free'}
            </button>
          </p>

          {/* Legal — required for Google OAuth verification + general good practice */}
          {isSignUp && (
            <p className="text-center text-xs text-muted-foreground/80 leading-relaxed">
              By creating an account you agree to our{' '}
              <Link to="/terms" className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
