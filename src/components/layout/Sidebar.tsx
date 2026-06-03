import { NavLink } from 'react-router-dom';
import {
  Home,
  ClipboardList,
  UtensilsCrossed,
  Dumbbell,
  Wine,
  Search,
  BarChart3,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/app', icon: Home, label: 'Dashboard' },
  { to: '/app/plan', icon: ClipboardList, label: 'Plan' },
  { to: '/app/log/food', icon: UtensilsCrossed, label: 'Log Food' },
  { to: '/app/log/workout', icon: Dumbbell, label: 'Log Workout' },
  { to: '/app/log/alcohol', icon: Wine, label: 'Log Alcohol' },
  { to: '/app/explore/recipes', icon: Search, label: 'Explore' },
  { to: '/app/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/app/profile', icon: User, label: 'Profile' },
];

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-border lg:block">
      <nav className="flex flex-col gap-1 p-3">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/app'}
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
      </nav>
    </aside>
  );
}
