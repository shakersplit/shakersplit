import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandMark';

/**
 * Terms of Service. Plain-English, personal-project flavored. Sets reasonable expectations
 * (this is a hobby app, not a medical product) without scaring users away.
 */
export function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark className="h-7 w-7" withBackground />
            <span className="text-lg font-extrabold tracking-tight">
              Shaker<span className="text-food">Split</span>
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mb-10">
            Last updated: June 3, 2026 · Effective immediately
          </p>

          <Section title="The short version">
            <p>
              ShakerSplit is a free hobby app. Use it for what it's for, don't try to break it,
              don't store medical-grade data on it. We can change or shut it down anytime. There's
              no warranty. Be cool. Have fun tracking your gains.
            </p>
          </Section>

          <Section title="1. Acceptance">
            <p>
              By creating an account or using ShakerSplit, you agree to these terms and to our{' '}
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. If
              you don't agree, don't use the service. You must be at least 13 years old to create
              an account.
            </p>
          </Section>

          <Section title="2. What ShakerSplit is (and isn't)">
            <p>
              ShakerSplit is a personal health and lifestyle tracker built and run by one person
              as a portfolio project. It is <strong>not</strong>:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li>A medical device, medical advice, or a substitute for professional healthcare</li>
              <li>A diagnostic tool or treatment recommendation system</li>
              <li>A business with paid support, SLAs, or uptime guarantees</li>
              <li>A backup service — keep your own copies of anything important</li>
            </ul>
            <p>
              If you're managing a medical condition, talk to a doctor. If you have a clinical
              eating disorder, alcohol use disorder, or are in recovery, please use professional
              tools designed for that — not a hobby tracker.
            </p>
          </Section>

          <Section title="3. Your account">
            <p>
              You're responsible for keeping your password safe. If you sign in with Google,
              follow Google's account security guidance. Don't share your account; tell us if you
              suspect unauthorized access. We can suspend or delete accounts that violate these
              terms.
            </p>
          </Section>

          <Section title="4. Acceptable use">
            <p>You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li>Try to break, scrape, or overwhelm the service</li>
              <li>Reverse engineer or copy substantial parts of the codebase (it's source-available, but the brand and deployment are ours)</li>
              <li>Use it for commercial resale or to build a competing product on top of our infrastructure</li>
              <li>Upload illegal content, malware, or content that violates someone else's rights</li>
              <li>Use it to harass, dox, or harm other users (the service is single-user — there shouldn't be a way, but just in case)</li>
              <li>Bypass authentication or rate limits</li>
              <li>Pretend to be someone else, including the developer</li>
            </ul>
          </Section>

          <Section title="5. Your content">
            <p>
              You retain all rights to anything you log — meals, workouts, drinks, plans, notes.
              You grant us a limited license to store and display that content back to you (and
              only to you) so the app works. We don't use your content for any other purpose.
            </p>
          </Section>

          <Section title="6. Service availability">
            <p>
              ShakerSplit runs on free tiers (Vercel, Supabase, Resend). We do our best to keep it
              up, but we make no guarantee — there will be downtime, bugs, and probably the
              occasional total outage. Build with that in mind.
            </p>
            <p>
              We may add features, remove features, or change how things work without notice. Big
              destructive changes (data wipes, account migrations) will trigger an email to all
              users at least 30 days in advance.
            </p>
          </Section>

          <Section title="7. Termination">
            <p>
              You can delete your account anytime from Profile → Delete account, or by emailing
              us. We can suspend or delete your account if you violate these terms. If we shut
              down ShakerSplit entirely, we'll give 30 days' notice and let you export your data.
            </p>
          </Section>

          <Section title="8. Disclaimers">
            <p>
              The service is provided "as is" and "as available" with no warranties of any kind,
              express or implied. We don't promise the service will be uninterrupted, secure,
              error-free, or that any data you log is accurate. Calorie estimates are computed
              from third-party data and your own input — they will be wrong sometimes. Do not
              rely on this app for any medical, dietary, or fitness decision.
            </p>
          </Section>

          <Section title="9. Limitation of liability">
            <p>
              To the fullest extent permitted by law, the developer is not liable for any
              indirect, incidental, consequential, or punitive damages arising from your use of
              the service. Our total liability for any direct damages is capped at the amount you
              paid us in the past 12 months — which, since the service is free, is zero.
            </p>
            <p>
              Some jurisdictions don't allow these limitations; in that case, the limit is the
              minimum amount the law requires.
            </p>
          </Section>

          <Section title="10. Indemnification">
            <p>
              You agree to indemnify the developer against any third-party claim arising from
              content you post, your use of the service in violation of these terms, or your
              violation of someone else's rights.
            </p>
          </Section>

          <Section title="11. Governing law">
            <p>
              These terms are governed by the laws of India. Any disputes will be handled in the
              courts of Bengaluru, Karnataka. If you're an EU/UK consumer, you have any local
              consumer-protection rights you would normally have — these terms don't override
              those.
            </p>
          </Section>

          <Section title="12. Changes">
            <p>
              We may update these terms occasionally. Material changes get an email at least 30
              days in advance. Continuing to use ShakerSplit after a change means you accept the
              new version.
            </p>
          </Section>

          <Section title="13. Contact">
            <p>
              Questions, complaints, or anything else —{' '}
              <a href="mailto:jhadivyansh2003@gmail.com" className="text-primary hover:underline">
                jhadivyansh2003@gmail.com
              </a>
              .
            </p>
          </Section>
        </div>

        <div className="mt-16 pt-8 border-t border-border flex flex-wrap gap-4 text-sm">
          <Link to="/privacy" className="text-muted-foreground hover:text-foreground">
            Privacy Policy →
          </Link>
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-2xl font-bold mb-4 mt-8 text-foreground">{title}</h2>
      <div className="space-y-4 text-base leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}
