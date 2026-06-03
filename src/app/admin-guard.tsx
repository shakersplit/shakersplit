import { Navigate } from 'react-router-dom';
import { useIsAdmin } from '@/hooks/useRole';

interface AdminGuardProps {
  children: React.ReactNode;
}

/**
 * Wraps admin-only routes. Renders a loading spinner while the role is being fetched,
 * redirects non-admins back to /app with no error toast (silent — admin paths shouldn't
 * exist for them in the UI either, this is just defense in depth).
 */
export function AdminGuard({ children }: AdminGuardProps) {
  const { isAdmin, isLoading } = useIsAdmin();

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/app" replace />;
  return <>{children}</>;
}
