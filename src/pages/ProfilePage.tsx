import { useAuth } from '@/hooks/useAuth';
import { useThemeStore } from '@/stores/theme.store';
import { User, LogOut, Moon, Sun } from 'lucide-react';

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useThemeStore();

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';

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
            <h3 className="text-lg font-semibold">{displayName}</h3>
            <p className="text-sm text-muted-foreground">{email}</p>
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
          onClick={signOut}
          className="flex w-full items-center gap-3 p-4 text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
