import { useAuth } from '@/hooks/useAuth';
import { useThemeStore } from '@/stores/theme.store';
import { Sun, Moon } from 'lucide-react';
import { getGreeting } from '@/lib/utils';
import { BrandMark } from '@/components/brand/BrandMark';

export function Header() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useThemeStore();

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';

  return (
    <header className="safe-top flex items-center justify-between border-b border-border px-4 py-3 md:px-6">
      <div className="flex items-center gap-3">
        <BrandMark className="h-7 w-7 shrink-0" withBackground />
        <h1 className="text-lg font-extrabold tracking-tight">
          Shaker<span className="text-food">Split</span>
        </h1>
        <span className="hidden text-sm text-muted-foreground md:inline">
          {getGreeting()}, {displayName}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="rounded-md p-2 hover:bg-secondary"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
          {displayName[0]?.toUpperCase()}
        </div>
      </div>
    </header>
  );
}
