import { NavLink } from 'react-router-dom';
import {
  Home,
  ClipboardList,
  UtensilsCrossed,
  Dumbbell,
  Wine,
  Scale,
  Search,
  BarChart3,
  User,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsAdmin } from '@/hooks/useRole';

const navItems = [
  { to: '/app', icon: Home, label: 'Dashboard', end: true },
  { to: '/app/plan', icon: ClipboardList, label: 'Plan', end: false },
  { to: '/app/log/food', icon: UtensilsCrossed, label: 'Log Food', end: false },
  { to: '/app/log/workout', icon: Dumbbell, label: 'Log Workout', end: false },
  { to: '/app/log/alcohol', icon: Wine, label: 'Log Alcohol', end: false },
  { to: '/app/log/weight', icon: Scale, label: 'Log Weight', end: false },
  { to: '/app/explore/recipes', icon: Search, label: 'Explore', end: false },
  { to: '/app/analytics', icon: BarChart3, label: 'Analytics', end: false },
  { to: '/app/profile', icon: User, label: 'Profile', end: false },
];

export function Sidebar() {
  const { isAdmin } = useIsAdmin();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-border lg:block">
      <nav className="flex flex-col gap-1 p-3">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-secondary text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}

        {/* Admin-only link, separated from the main nav for clarity. */}
        {isAdmin && (
          <>
            <div className="my-2 h-px bg-border" />
            <NavLink
              to="/app/admin"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
                )
              }
            >
              <Shield className="h-4 w-4" />
              Admin Panel
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  );
}
