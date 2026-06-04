import { Link } from 'react-router-dom';
import {
  UtensilsCrossed,
  Dumbbell,
  Wine,
  BarChart3,
  CalendarDays,
  Flame,
  Shield,
  Smartphone,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandMark';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';

const FEATURES = [
  {
    icon: UtensilsCrossed,
    color: 'text-food',
    bg: 'bg-food/10',
    title: 'Food Logging',
    desc: 'Track every meal, macro, and calorie with a fast multi-item logger.',
  },
  {
    icon: Dumbbell,
    color: 'text-workout',
    bg: 'bg-workout/10',
    title: 'Workout Tracking',
    desc: 'Log push, pull, legs, runs — sets, reps, weight, and duration.',
  },
  {
    icon: Wine,
    color: 'text-alcohol',
    bg: 'bg-alcohol/10',
    title: 'Alcohol Log',
    desc: 'Track drinks with a damage-control checklist. Hydrate smarter.',
  },
  {
    icon: CalendarDays,
    color: 'text-primary',
    bg: 'bg-primary/10',
    title: 'Weekly Planner',
    desc: 'Plan your meals, workouts, and social nights across a 7-day grid.',
  },
  {
    icon: BarChart3,
    color: 'text-mental',
    bg: 'bg-mental/10',
    title: 'Analytics',
    desc: 'See trends across calories, workout frequency, and alcohol habits.',
  },
  {
    icon: Flame,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    title: 'Streaks',
    desc: 'Build consecutive-day streaks for food logging, workouts, and sobriety.',
  },
];

const PERKS = [
  'Completely free — no subscriptions, ever',
  'Installable on iPhone & Android as a PWA',
  'Dark mode by default',
  'Your data stays yours',
  'Works offline (cached shell)',
];

export function HomePage() {
  // When already signed in, the marketing CTAs become "Open app" / "Sign out" so the user
  // can actually exit the marketing page. Otherwise clicking "Sign in" loops back here.
  const { isAuthenticated, signOut } = useAuth();
  const toast = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out.');
    } catch (err) {
      console.error('sign out failed', err);
      toast.error(err instanceof Error ? err.message : 'Sign out failed.', {
        action: { label: 'Try again', onClick: handleSignOut },
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark className="h-7 w-7" withBackground />
            <span className="text-lg font-extrabold tracking-tight">Shaker<span className="text-food">Split</span></span>
          </Link>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign out
                </button>
                <Link
                  to="/app"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Open app
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/auth?signup=true"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Get started free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-20 pb-16 text-center overflow-hidden">
        {/* Background glow blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-food/10 blur-3xl" />
          <div className="absolute right-1/4 top-1/2 h-80 w-80 rounded-full bg-workout/10 blur-3xl" />
          <div className="absolute bottom-1/4 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-alcohol/10 blur-3xl" />
        </div>

        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <Smartphone className="h-3.5 w-3.5" />
          Installable PWA · $0/month · Works on iOS &amp; Android
        </div>

        <h1 className="max-w-3xl text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
          Track food, gains,{' '}
          <span className="bg-gradient-to-r from-food via-workout to-alcohol bg-clip-text text-transparent">
            and the nights out.
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed">
          ShakerSplit is a zero-cost health tracker for people who go hard at the gym{' '}
          <em>and</em> at the party. Log meals, workouts, and drinks in one place — no
          subscriptions, no bullshit.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            to={isAuthenticated ? '/app' : '/auth?signup=true'}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
          >
            {isAuthenticated ? 'Open app' : 'Start for free'} <ArrowRight className="h-4 w-4" />
          </Link>
          {!isAuthenticated && (
            <Link
              to="/auth"
              className="rounded-xl border border-border px-6 py-3 text-base font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>

        {/* Mini stat pills */}
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          {[
            { label: 'Food logged', color: 'text-food', icon: UtensilsCrossed },
            { label: 'Workouts tracked', color: 'text-workout', icon: Dumbbell },
            { label: 'Alcohol logged', color: 'text-alcohol', icon: Wine },
          ].map(({ label, color, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm"
            >
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything in one place</h2>
          <p className="mt-3 text-muted-foreground">
            Built for real life — gym days, rest days, and Saturday nights.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
            <div
              key={title}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className={`mb-4 inline-flex rounded-xl p-3 ${bg}`}>
                <Icon className={`h-6 w-6 ${color}`} />
              </div>
              <h3 className="mb-2 font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Perks / why free */}
      <section className="border-t border-border bg-secondary/20 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Shield className="mx-auto mb-4 h-8 w-8 text-food" />
          <h2 className="mb-2 text-3xl font-bold tracking-tight">Forever free, no catch</h2>
          <p className="mb-10 text-muted-foreground">
            Runs entirely on Supabase + Vercel free tiers. No credit card. No premium tier.
          </p>
          <ul className="mx-auto max-w-sm space-y-3 text-left">
            {PERKS.map((p) => (
              <li key={p} className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-food" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {isAuthenticated ? 'Pick up where you left off.' : 'Ready to actually track your life?'}
        </h2>
        <p className="mb-8 text-muted-foreground">
          {isAuthenticated ? 'Your dashboard is one click away.' : 'Takes 30 seconds to sign up.'}
        </p>
        <Link
          to={isAuthenticated ? '/app' : '/auth?signup=true'}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
        >
          {isAuthenticated ? 'Open app' : 'Get started free'} <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-5 w-5" withBackground />
            <span className="text-sm font-bold tracking-tight">
              Shaker<span className="text-food">Split</span>
            </span>
            <span className="text-xs text-muted-foreground ml-2">© 2026 · Free forever</span>
          </div>
          <nav className="flex items-center gap-5 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <a
              href="https://github.com/shakersplit/shakersplit"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <a
              href="mailto:jhadivyansh2003@gmail.com"
              className="hover:text-foreground transition-colors"
            >
              Contact
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
