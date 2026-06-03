import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  Shield,
  Users,
  UtensilsCrossed,
  Dumbbell,
  Wine,
  Scale,
  ClipboardList,
  TrendingUp,
  Trash2,
  ShieldOff,
  ShieldCheck,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { ApiResponse } from '@/types';

interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  role: 'ADMIN' | 'USER';
  created_at: string;
  food_log_count: number;
  workout_log_count: number;
  alcohol_log_count: number;
}

interface AdminStats {
  total_users: number;
  admin_users: number;
  new_signups_7d: number;
  total_food_logs: number;
  total_workout_logs: number;
  total_alcohol_logs: number;
  total_weight_logs: number;
  total_plans: number;
}

export function AdminPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: statsResp, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => apiClient<ApiResponse<AdminStats>>('/admin/stats'),
  });

  const { data: usersResp, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => apiClient<ApiResponse<AdminUser[]>>('/admin/users'),
  });

  const promote = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'USER' | 'ADMIN' }) =>
      apiClient('/admin/users', { method: 'PATCH', params: { id }, body: { role } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });

  const removeUser = useMutation({
    mutationFn: (id: string) => apiClient('/admin/users', { method: 'DELETE', params: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });

  const stats = statsResp?.data;
  const allUsers = usersResp?.data ?? [];
  const filteredUsers = search.trim()
    ? allUsers.filter(
        (u) =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          (u.display_name ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : allUsers;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Admin Panel</h2>
        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          Admin only
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard label="Total users" value={stats?.total_users} loading={statsLoading} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Admins" value={stats?.admin_users} loading={statsLoading} icon={<ShieldCheck className="h-4 w-4" />} />
        <StatCard label="New (7d)" value={stats?.new_signups_7d} loading={statsLoading} icon={<TrendingUp className="h-4 w-4" />} accent="text-food" />
        <StatCard label="Plans" value={stats?.total_plans} loading={statsLoading} icon={<ClipboardList className="h-4 w-4" />} />
        <StatCard label="Food logs" value={stats?.total_food_logs} loading={statsLoading} icon={<UtensilsCrossed className="h-4 w-4 text-food" />} />
        <StatCard label="Workouts" value={stats?.total_workout_logs} loading={statsLoading} icon={<Dumbbell className="h-4 w-4 text-workout" />} />
        <StatCard label="Alcohol" value={stats?.total_alcohol_logs} loading={statsLoading} icon={<Wine className="h-4 w-4 text-alcohol" />} />
        <StatCard label="Weight" value={stats?.total_weight_logs} loading={statsLoading} icon={<Scale className="h-4 w-4 text-mental" />} />
      </div>

      {/* Users table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="text-base font-semibold">All users</h3>
            <p className="text-xs text-muted-foreground">
              {usersLoading ? '…' : `${allUsers.length} total · ${filteredUsers.length} shown`}
            </p>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name…"
            className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-64"
          />
        </div>

        {usersLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading users…</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {allUsers.length === 0 ? 'No users yet.' : 'No matches.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-right font-medium">Food</th>
                  <th className="px-4 py-3 text-right font-medium">Workout</th>
                  <th className="px-4 py-3 text-right font-medium">Alcohol</th>
                  <th className="px-4 py-3 text-left font-medium">Joined</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isMe = u.id === user?.id;
                  return (
                    <tr key={u.id} className="border-b border-border last:border-b-0 hover:bg-secondary/30">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">
                            {u.display_name || u.email.split('@')[0]}
                            {isMe && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            u.role === 'ADMIN'
                              ? 'bg-primary/15 text-primary'
                              : 'bg-secondary text-muted-foreground'
                          }`}
                        >
                          {u.role === 'ADMIN' && <ShieldCheck className="h-3 w-3" />}
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{u.food_log_count}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{u.workout_log_count}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{u.alcohol_log_count}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {!isMe && (
                            <button
                              disabled={promote.isPending}
                              onClick={() => {
                                const next = u.role === 'ADMIN' ? 'USER' : 'ADMIN';
                                if (window.confirm(`${next === 'ADMIN' ? 'Promote' : 'Demote'} ${u.email} to ${next}?`)) {
                                  promote.mutate({ id: u.id, role: next });
                                }
                              }}
                              aria-label={u.role === 'ADMIN' ? 'Demote to user' : 'Promote to admin'}
                              className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
                            >
                              {u.role === 'ADMIN' ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                            </button>
                          )}
                          {!isMe && (
                            <button
                              disabled={removeUser.isPending}
                              onClick={() => {
                                if (window.confirm(`Permanently delete ${u.email} and ALL their data? This cannot be undone.`)) {
                                  removeUser.mutate(u.id);
                                }
                              }}
                              aria-label="Delete user"
                              className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(promote.isError || removeUser.isError) && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {(promote.error as Error)?.message || (removeUser.error as Error)?.message || 'Action failed.'}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
  icon,
  accent,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className={`mt-1 text-2xl font-bold ${accent ?? ''}`}>
        {loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-secondary" /> : (value ?? 0).toLocaleString()}
      </p>
    </div>
  );
}
