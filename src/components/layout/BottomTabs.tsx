import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  ClipboardList,
  PenSquare,
  Search,
  User,
  X,
  UtensilsCrossed,
  Dumbbell,
  Wine,
  Scale,
  Heart,
  Users,
  Newspaper,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/app', icon: Home, label: 'Home' },
  { to: '/app/feed', icon: Newspaper, label: 'Feed' },
  // The "Log" tab is special: opens a sheet of log shortcuts.
  { to: '__log__', icon: PenSquare, label: 'Log' },
  { to: '/app/friends', icon: Users, label: 'Friends' },
  { to: '/app/profile', icon: User, label: 'Profile' },
] as const;

export function BottomTabs() {
  const [logOpen, setLogOpen] = useState(false);

  return (
    <>
      <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center justify-around py-2">
          {tabs.map(({ to, icon: Icon, label }) =>
            to === '__log__' ? (
              <button
                key="log"
                onClick={() => setLogOpen(true)}
                className="flex flex-col items-center gap-0.5 px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </button>
            ) : (
              <NavLink
                key={to}
                to={to}
                end={to === '/app'}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </NavLink>
            ),
          )}
        </div>
      </nav>

      {/* Log sheet — appears from the bottom when "Log" tab is tapped. */}
      {logOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 lg:hidden"
            onClick={() => setLogOpen(false)}
            aria-hidden="true"
          />
          <div className="safe-bottom fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-border bg-card p-4 shadow-2xl lg:hidden">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-base font-semibold">What do you want to log?</h3>
              <button
                onClick={() => setLogOpen(false)}
                aria-label="Close"
                className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SheetLink to="/app/log/food" label="Food" icon={<UtensilsCrossed className="h-5 w-5 text-food" />} onClick={() => setLogOpen(false)} />
              <SheetLink to="/app/log/workout" label="Workout" icon={<Dumbbell className="h-5 w-5 text-workout" />} onClick={() => setLogOpen(false)} />
              <SheetLink to="/app/log/alcohol" label="Alcohol" icon={<Wine className="h-5 w-5 text-alcohol" />} onClick={() => setLogOpen(false)} />
              <SheetLink to="/app/log/weight" label="Weight" icon={<Scale className="h-5 w-5 text-mental" />} onClick={() => setLogOpen(false)} />
              <SheetLink to="/app/log/mental" label="Mood" icon={<Heart className="h-5 w-5 text-mental" />} onClick={() => setLogOpen(false)} />
              <SheetLink to="/app/plan" label="Plan" icon={<ClipboardList className="h-5 w-5" />} onClick={() => setLogOpen(false)} />
              <SheetLink to="/app/goals" label="Goals" icon={<Target className="h-5 w-5 text-primary" />} onClick={() => setLogOpen(false)} />
              <SheetLink to="/app/explore/recipes" label="Explore" icon={<Search className="h-5 w-5" />} onClick={() => setLogOpen(false)} />
            </div>
          </div>
        </>
      )}
    </>
  );
}

function SheetLink({
  to,
  label,
  icon,
  onClick,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm font-medium hover:bg-secondary/50 transition-colors"
    >
      {icon}
      {label}
    </NavLink>
  );
}
