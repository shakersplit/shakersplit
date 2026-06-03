import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useThemeStore } from '@/stores/theme.store';
import { useUserProfile, useIsAdmin } from '@/hooks/useRole';
import { supabase } from '@/lib/supabase';
import { User, LogOut, Moon, Sun, Trash2, ShieldCheck, Mail } from 'lucide-react';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useThemeStore();
  const { isAdmin } = useIsAdmin();
  const { data: profileResp } = useUserProfile();

  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');

  const displayName =
    profileResp?.data?.display_name ||
    user?.user_metadata?.display_name ||
    user?.email?.split('@')[0] ||
    'User';
  const email = user?.email || '';

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed');
      setSigningOut(false);
    }
  };

  /**
   * Self-delete via DELETE /api/users/me. Backend uses the auth admin API to remove
   * the user, which cascades to all owned rows and revokes tokens.
   */
  const handleDeleteAccount = async () => {
    if (confirmText !== email) {
      setError('Type your email exactly to confirm.');
      return;
    }
    setDeleting(true);
    setError('');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch('/api/users/me', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? 'Failed to delete account');
      }
      // Local cleanup + redirect.
      await supabase.auth.signOut();
      localStorage.removeItem('shakersplit-theme');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <User className="h-5 w-5" />
        <h2 className="text-xl font-bold">Profile</h2>
      </div>

      {/* Profile Card */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold">
            {displayName[0]?.toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold">{displayName}</h3>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                  <ShieldCheck className="h-3 w-3" /> Admin
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 break-all">
              <Mail className="h-3 w-3 shrink-0" /> {email}
            </p>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        <button
          onClick={toggleTheme}
          className="flex w-full items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span className="text-sm font-medium">Theme</span>
          </div>
          <span className="text-sm text-muted-foreground capitalize">{theme}</span>
        </button>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex w-full items-center gap-3 p-4 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm font-medium">{signingOut ? 'Signing out…' : 'Sign Out'}</span>
        </button>
      </div>

      {/* Danger zone */}
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-destructive">Danger zone</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Deleting your account permanently removes you and ALL your logs, plans, and weights. This cannot be undone.
          </p>
        </div>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-destructive/50 bg-card px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" /> Delete my account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              To confirm, type your email <span className="font-mono font-semibold">{email}</span> below.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={email}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive"
            />
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || confirmText !== email}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Permanently delete account'}
              </button>
              <button
                onClick={() => {
                  setConfirmDelete(false);
                  setConfirmText('');
                  setError('');
                }}
                disabled={deleting}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
        )}
      </div>
    </div>
  );
}
