import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandMark';

/**
 * Privacy policy. Hand-written for ShakerSplit's actual data model rather than a generic
 * boilerplate — accuracy here is what makes Google's OAuth verification reviewer trust the app.
 *
 * Data we actually touch:
 *   - email (Supabase auth.users)
 *   - display_name (from sign-up form, OR Google identity payload)
 *   - food/workout/alcohol log entries with user-supplied descriptions, calories, dates
 *   - weekly plan entries
 *   - profile preferences (theme, units)
 *
 * Data we DO NOT touch:
 *   - location, contacts, photos, files, anything from Google beyond email+name+avatar
 *   - third-party advertising or analytics that share PII
 */
export function PrivacyPage() {
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
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-10">
            Last updated: June 3, 2026 · Effective immediately
          </p>

          <Section title="The short version">
            <p>
              ShakerSplit is a free, single-developer hobby project. We collect the minimum data
              needed to make a personal health tracker work — your email, the things you log, and
              a session token that keeps you signed in. We don't sell your data, we don't run ads,
              we don't send you marketing emails, and you can delete your account at any time and
              everything is gone within 30 days.
            </p>
          </Section>

          <Section title="1. Who we are">
            <p>
              ShakerSplit is operated by Divyansh Jha as a personal portfolio project. We're not a
              company; there is no support team and no commercial entity behind it. Reach the
              developer at{' '}
              <a href="mailto:jhadivyansh2003@gmail.com" className="text-primary hover:underline">
                jhadivyansh2003@gmail.com
              </a>{' '}
              for any privacy questions or data deletion requests.
            </p>
          </Section>

          <Section title="2. What we collect">
            <p>We collect only what is necessary for the app to function:</p>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li>
                <strong>Account info:</strong> your email address and a display name. If you sign
                in with Google, we also receive your Google avatar URL — nothing else from your
                Google account.
              </li>
              <li>
                <strong>Authentication tokens:</strong> a session JWT issued by Supabase, stored
                client-side, used to authorize your API calls.
              </li>
              <li>
                <strong>Log entries you create:</strong> food, workouts, alcohol, weekly plans —
                whatever you type in. These are yours; we never look at the contents.
              </li>
              <li>
                <strong>Preferences:</strong> theme, units, and similar UI settings.
              </li>
              <li>
                <strong>Server logs:</strong> Vercel and Supabase keep standard request logs (IP,
                timestamp, route) for ~30 days for security and debugging. We don't query them
                unless investigating abuse.
              </li>
            </ul>
            <p>
              We <strong>do not</strong> collect: location, contacts, files, photos (other than
              what you explicitly upload), browsing history, advertising identifiers, or any
              health data beyond what you choose to log.
            </p>
          </Section>

          <Section title="3. How we use what we collect">
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li>To show you your own data when you sign in.</li>
              <li>To send transactional email — signup confirmation, password resets, magic-link sign-ins. Nothing else.</li>
              <li>To investigate technical problems if something breaks.</li>
            </ul>
            <p>We do not use your data to train AI models, generate profiles, or target ads.</p>
          </Section>

          <Section title="4. Who we share it with">
            <p>Three subprocessors only, all bound by their own privacy policies:</p>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li>
                <strong>Supabase</strong> (database, authentication) —{' '}
                <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  supabase.com/privacy
                </a>
              </li>
              <li>
                <strong>Vercel</strong> (web hosting, serverless functions) —{' '}
                <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  vercel.com/legal/privacy-policy
                </a>
              </li>
              <li>
                <strong>Resend</strong> (transactional email delivery) —{' '}
                <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  resend.com/legal/privacy-policy
                </a>
              </li>
            </ul>
            <p>
              We do <strong>not</strong> sell, rent, or trade your data with anyone. We don't share
              it with advertisers, analytics brokers, or anyone else.
            </p>
          </Section>

          <Section title="5. How long we keep it">
            <p>
              Your data lives on our servers as long as your account exists. Server-side request
              logs are kept for ~30 days by our infrastructure providers and then automatically
              purged.
            </p>
            <p>
              When you delete your account (Profile → Delete account, or by emailing us), we run
              a hard-delete of your row in <code>auth.users</code>, which cascades to every log
              entry, plan, and preference you created. Backups are purged within 30 days. Email
              transmission logs at Resend are retained for their standard 30-day window.
            </p>
          </Section>

          <Section title="6. Your rights">
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 mb-4">
              <li><strong>Access:</strong> See everything we have on you. The app shows it all by design.</li>
              <li><strong>Export:</strong> Email us — we'll send a JSON dump within 7 days.</li>
              <li><strong>Correct:</strong> Edit your profile and any log entry directly in the app.</li>
              <li><strong>Delete:</strong> Use the in-app delete button or email us. Hard delete within 30 days, including backups.</li>
              <li><strong>Withdraw consent:</strong> Sign out and delete your account at any time.</li>
            </ul>
            <p>
              We honor requests under GDPR (EU/UK), CCPA (California), DPDP (India), and similar
              regimes. There is no fee, no identity verification beyond the email on your account.
            </p>
          </Section>

          <Section title="7. Cookies and local storage">
            <p>
              We use <strong>localStorage</strong> for your auth session (so you stay signed in)
              and theme preference. We do not use third-party cookies or analytics trackers. We
              don't show a cookie banner because we don't need consent for strictly-necessary
              storage.
            </p>
          </Section>

          <Section title="8. Children">
            <p>
              ShakerSplit is not directed at users under 13. If you believe a child under 13 has
              created an account, email us and we'll delete it.
            </p>
          </Section>

          <Section title="9. Security">
            <p>
              All traffic is HTTPS (Let's Encrypt certs via Vercel). Passwords are hashed by
              Supabase Auth (bcrypt). API access is scoped per-user via Supabase Row Level
              Security. We use the principle of least privilege — even the developer can't read
              your log entries through normal app channels.
            </p>
            <p>
              That said: this is a personal project run by one person. If you store something
              you'd be devastated to see leak (medical records, legal info), use a properly-staffed
              service instead.
            </p>
          </Section>

          <Section title="10. International transfers">
            <p>
              Our database lives in Supabase's infrastructure, which may host data in any of their
              global regions. By using ShakerSplit you consent to your data being processed in
              those regions, which include the United States and the European Union.
            </p>
          </Section>

          <Section title="11. Google OAuth specifically">
            <p>
              When you sign in with Google, we request only the <code>openid</code>,{' '}
              <code>email</code>, and <code>profile</code> scopes. We use these only to create or
              look up your account in our database. We never request access to Drive, Gmail,
              Calendar, Contacts, or any other Google service. The Google data we receive is
              limited to your name, email address, and avatar URL — nothing else.
            </p>
            <p>
              Our use of information received from Google APIs adheres to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </Section>

          <Section title="12. Changes to this policy">
            <p>
              If we change this policy materially, we'll notify signed-up users by email at least
              30 days before the changes take effect. Minor changes (clarifying wording, fixing
              typos) won't trigger an email.
            </p>
          </Section>

          <Section title="13. Contact">
            <p>
              Questions, requests, complaints — email{' '}
              <a href="mailto:jhadivyansh2003@gmail.com" className="text-primary hover:underline">
                jhadivyansh2003@gmail.com
              </a>
              . We aim to respond within 7 days.
            </p>
          </Section>
        </div>

        <div className="mt-16 pt-8 border-t border-border flex flex-wrap gap-4 text-sm">
          <Link to="/terms" className="text-muted-foreground hover:text-foreground">
            Terms of Service →
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
