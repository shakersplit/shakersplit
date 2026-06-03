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
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/plan', icon: ClipboardList, label: 'Plan' },
  { to: '/log/food', icon: UtensilsCrossed, label: 'Log Food' },
  { to: '/log/workout', icon: Dumbbell, label: 'Log Workout' },
  { to: '/log/alcohol', icon: Wine, label: 'Log Alcohol' },
  { to: '/explore/recipes', icon: Search, label: 'Explore' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/admin', icon: Shield, label: 'Admin' },
];

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-border lg:block">
      <nav className="flex flex-col gap-1 p-3">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
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
