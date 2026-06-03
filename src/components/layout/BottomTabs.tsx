import { NavLink } from 'react-router-dom';
import { Home, ClipboardList, PenSquare, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/plan', icon: ClipboardList, label: 'Plan' },
  { to: '/log/food', icon: PenSquare, label: 'Log' },
  { to: '/explore/recipes', icon: Search, label: 'Explore' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export function BottomTabs() {
  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center justify-around py-2">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
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
        ))}
      </div>
    </nav>
  );
}
