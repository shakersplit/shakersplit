import { Navigate } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useRole';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
}

/**
 * Wraps admin-only routes. Three states:
 *  - LOADING — spinner while the role is being fetched
 *  - ERROR — the /users/me query failed; show a recoverable error UI with retry
 *  - NOT-ADMIN — silent redirect to /app (admin paths shouldn't exist in their nav either,
 *    this is just defense in depth)
 *  - ADMIN — render children
 */
export function AdminGuard({ children }: AdminGuardProps) {
  const { data, isLoading, error, refetch, isFetching } = useUserProfile();

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <h2 className="text-lg font-semibold">Couldn't verify your access</h2>
        <p className="text-sm text-muted-foreground">
          The role check failed. This usually fixes itself on retry.
        </p>
        <p className="text-xs text-muted-foreground/80 font-mono break-all max-w-full">
          {error instanceof Error ? error.message : String(error)}
        </p>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Retrying…' : 'Retry'}
        </button>
      </div>
    );
  }

  if (data?.data?.role !== 'ADMIN') return <Navigate to="/app" replace />;
  return <>{children}</>;
}
