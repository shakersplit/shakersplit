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
  Heart,
  Plus,
  Edit3,
  X,
  ChefHat,
  Bell,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { PhotoUploader } from '@/components/photo/PhotoUploader';
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
  total_mental_logs: number;
  total_plans: number;
  total_recipes: number;
  total_routines: number;
}

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  category: string;
  calories: number | null;
  protein_g: number | null;
  prep_time_minutes: number | null;
  ingredients: { name: string; quantity?: string }[];
  instructions: string | null;
  youtube_url: string | null;
  photo_url: string | null;
  is_public: boolean;
  created_at: string;
}

interface Routine {
  id: string;
  title: string;
  description: string | null;
  workout_type: string;
  exercises: { name: string; sets?: number; reps?: number }[];
  youtube_url: string | null;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  is_public: boolean;
  created_at: string;
}

type Tab = 'overview' | 'users' | 'recipes' | 'routines' | 'broadcast';

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Admin Panel</h2>
        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          Admin only
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>Overview</TabButton>
        <TabButton active={tab === 'users'} onClick={() => setTab('users')}>Users</TabButton>
        <TabButton active={tab === 'recipes'} onClick={() => setTab('recipes')}>Recipes</TabButton>
        <TabButton active={tab === 'routines'} onClick={() => setTab('routines')}>Routines</TabButton>
        <TabButton active={tab === 'broadcast'} onClick={() => setTab('broadcast')}>Broadcast</TabButton>
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'recipes' && <RecipesTab />}
      {tab === 'routines' && <RoutinesTab />}
      {tab === 'broadcast' && <BroadcastTab />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

// ── Overview tab ────────────────────────────────────────────────────────────
function OverviewTab() {
  const { data: statsResp, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => apiClient<ApiResponse<AdminStats>>('/admin', { params: { resource: 'stats' } }),
  });
  const stats = statsResp?.data;

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      <StatCard label="Total users" value={stats?.total_users} loading={isLoading} icon={<Users className="h-4 w-4" />} />
      <StatCard label="Admins" value={stats?.admin_users} loading={isLoading} icon={<ShieldCheck className="h-4 w-4" />} />
      <StatCard label="New (7d)" value={stats?.new_signups_7d} loading={isLoading} icon={<TrendingUp className="h-4 w-4" />} accent="text-food" />
      <StatCard label="Plans" value={stats?.total_plans} loading={isLoading} icon={<ClipboardList className="h-4 w-4" />} />
      <StatCard label="Food logs" value={stats?.total_food_logs} loading={isLoading} icon={<UtensilsCrossed className="h-4 w-4 text-food" />} />
      <StatCard label="Workouts" value={stats?.total_workout_logs} loading={isLoading} icon={<Dumbbell className="h-4 w-4 text-workout" />} />
      <StatCard label="Alcohol" value={stats?.total_alcohol_logs} loading={isLoading} icon={<Wine className="h-4 w-4 text-alcohol" />} />
      <StatCard label="Weight" value={stats?.total_weight_logs} loading={isLoading} icon={<Scale className="h-4 w-4 text-mental" />} />
      <StatCard label="Mental" value={stats?.total_mental_logs} loading={isLoading} icon={<Heart className="h-4 w-4 text-mental" />} />
      <StatCard label="Recipes" value={stats?.total_recipes} loading={isLoading} icon={<ChefHat className="h-4 w-4" />} />
      <StatCard label="Routines" value={stats?.total_routines} loading={isLoading} icon={<Dumbbell className="h-4 w-4" />} />
    </div>
  );
}

// ── Users tab ───────────────────────────────────────────────────────────────
function UsersTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: usersResp, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => apiClient<ApiResponse<AdminUser[]>>('/admin', { params: { resource: 'users' } }),
  });

  const promote = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'USER' | 'ADMIN' }) =>
      apiClient('/admin', { method: 'PATCH', params: { resource: 'users', id }, body: { role } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });

  const removeUser = useMutation({
    mutationFn: (id: string) => apiClient('/admin', { method: 'DELETE', params: { resource: 'users', id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });

  const allUsers = usersResp?.data ?? [];
  const filtered = search.trim()
    ? allUsers.filter(
        (u) =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          (u.display_name ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : allUsers;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="text-base font-semibold">All users</h3>
          <p className="text-xs text-muted-foreground">
            {isLoading ? '…' : `${allUsers.length} total · ${filtered.length} shown`}
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

      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading users…</div>
      ) : filtered.length === 0 ? (
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
              {filtered.map((u) => {
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
                          u.role === 'ADMIN' ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
                        }`}
                      >
                        {u.role === 'ADMIN' && <ShieldCheck className="h-3 w-3" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{u.food_log_count}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{u.workout_log_count}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{u.alcohol_log_count}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(u.created_at)}</td>
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
  );
}

// ── Recipes tab ─────────────────────────────────────────────────────────────
function RecipesTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'recipes'],
    queryFn: () => apiClient<ApiResponse<Recipe[]>>('/admin', { params: { resource: 'recipes' } }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiClient('/admin', { method: 'DELETE', params: { resource: 'recipes', id } }),
    onSuccess: () => {
      // Invalidate BOTH the admin list AND the public Explore cache.
      queryClient.invalidateQueries({ queryKey: ['admin', 'recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipes', 'public'] });
    },
  });

  const recipes = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Recipes ({recipes.length})</h3>
        <button
          onClick={() => { setEditing(null); setCreating(true); }}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New recipe
        </button>
      </div>

      {(creating || editing) && (
        <RecipeForm
          recipe={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-secondary" />)}
        </div>
      ) : recipes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <ChefHat className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">No recipes yet. Click "New recipe" to add one.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {recipes.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
              {r.photo_url && (
                <img src={r.photo_url} alt={r.title} className="h-12 w-12 rounded-lg object-cover shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {r.title}
                  {!r.is_public && <span className="ml-2 text-xs text-muted-foreground">(private)</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.category}
                  {r.calories && ` · ${r.calories} cal`}
                  {r.prep_time_minutes && ` · ${r.prep_time_minutes} min`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => { setCreating(false); setEditing(r); }}
                  aria-label="Edit"
                  className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => { if (window.confirm(`Delete recipe "${r.title}"?`)) remove.mutate(r.id); }}
                  aria-label="Delete"
                  className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecipeForm({ recipe, onClose }: { recipe: Recipe | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(recipe?.title ?? '');
  const [description, setDescription] = useState(recipe?.description ?? '');
  const [category, setCategory] = useState(recipe?.category ?? 'HEALTHY');
  const [calories, setCalories] = useState(recipe?.calories?.toString() ?? '');
  const [protein, setProtein] = useState(recipe?.protein_g?.toString() ?? '');
  const [prepTime, setPrepTime] = useState(recipe?.prep_time_minutes?.toString() ?? '');
  const [instructions, setInstructions] = useState(recipe?.instructions ?? '');
  const [youtubeUrl, setYoutubeUrl] = useState(recipe?.youtube_url ?? '');
  const [photoUrl, setPhotoUrl] = useState<string | null>(recipe?.photo_url ?? null);
  const [isPublic, setIsPublic] = useState(recipe?.is_public ?? true);
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => {
      if (recipe) {
        return apiClient('/admin', { method: 'PATCH', params: { resource: 'recipes', id: recipe.id }, body });
      }
      return apiClient('/admin', { method: 'POST', params: { resource: 'recipes' }, body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipes', 'public'] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) { setError('Title is required'); return; }
        save.mutate({
          title: title.trim(),
          description: description.trim() || null,
          category,
          calories: calories ? Number(calories) : null,
          protein_g: protein ? Number(protein) : null,
          prep_time_minutes: prepTime ? Number(prepTime) : null,
          instructions: instructions.trim() || null,
          youtube_url: youtubeUrl.trim() || null,
          photo_url: photoUrl,
          is_public: isPublic,
        });
      }}
      className="rounded-lg border border-primary/30 bg-card p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{recipe ? 'Edit recipe' : 'New recipe'}</h4>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-muted-foreground hover:bg-secondary">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {['PRE_WORKOUT', 'POST_WORKOUT', 'PRE_GAME', 'HEALTHY', 'COCKTAIL', 'SNACK'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <textarea
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Short description"
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
      />
      <div className="grid gap-3 grid-cols-3">
        <input
          type="number"
          step="0.1"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          placeholder="Calories"
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="number"
          step="0.1"
          value={protein}
          onChange={(e) => setProtein(e.target.value)}
          placeholder="Protein g"
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="number"
          value={prepTime}
          onChange={(e) => setPrepTime(e.target.value)}
          placeholder="Prep min"
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <textarea
        rows={3}
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="Instructions"
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
      />
      <input
        type="url"
        value={youtubeUrl}
        onChange={(e) => setYoutubeUrl(e.target.value)}
        placeholder="YouTube URL (optional)"
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex items-center gap-4">
        <PhotoUploader scope="recipe" value={photoUrl} onChange={setPhotoUrl} />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Public (visible in Explore)
        </label>
      </div>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={save.isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {save.isPending ? 'Saving…' : recipe ? 'Update' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Routines tab ────────────────────────────────────────────────────────────
function RoutinesTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Routine | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'routines'],
    queryFn: () => apiClient<ApiResponse<Routine[]>>('/admin', { params: { resource: 'routines' } }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiClient('/admin', { method: 'DELETE', params: { resource: 'routines', id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'routines'] });
      queryClient.invalidateQueries({ queryKey: ['workout-routines', 'public'] });
    },
  });

  const routines = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Workout routines ({routines.length})</h3>
        <button
          onClick={() => { setEditing(null); setCreating(true); }}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New routine
        </button>
      </div>

      {(creating || editing) && (
        <RoutineForm
          routine={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-secondary" />)}
        </div>
      ) : routines.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <Dumbbell className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">No routines yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {routines.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {r.title}
                  {!r.is_public && <span className="ml-2 text-xs text-muted-foreground">(private)</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.workout_type} · {r.difficulty.toLowerCase()} · {(r.exercises ?? []).length} exercises
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => { setCreating(false); setEditing(r); }} aria-label="Edit"
                  className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { if (window.confirm(`Delete routine "${r.title}"?`)) remove.mutate(r.id); }} aria-label="Delete"
                  className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RoutineForm({ routine, onClose }: { routine: Routine | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(routine?.title ?? '');
  const [description, setDescription] = useState(routine?.description ?? '');
  const [workoutType, setWorkoutType] = useState(routine?.workout_type ?? 'GYM_FULL');
  const [difficulty, setDifficulty] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>(routine?.difficulty ?? 'INTERMEDIATE');
  // Exercises serialized as a freeform text area, one exercise per line.
  const [exercisesText, setExercisesText] = useState(
    (routine?.exercises ?? []).map((e) => e.name).join('\n')
  );
  const [youtubeUrl, setYoutubeUrl] = useState(routine?.youtube_url ?? '');
  const [isPublic, setIsPublic] = useState(routine?.is_public ?? true);
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => {
      if (routine) {
        return apiClient('/admin', { method: 'PATCH', params: { resource: 'routines', id: routine.id }, body });
      }
      return apiClient('/admin', { method: 'POST', params: { resource: 'routines' }, body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'routines'] });
      queryClient.invalidateQueries({ queryKey: ['workout-routines', 'public'] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) { setError('Title is required'); return; }
        const exercises = exercisesText
          .split('\n')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .map((name) => ({ name }));
        save.mutate({
          title: title.trim(),
          description: description.trim() || null,
          workout_type: workoutType,
          difficulty,
          exercises,
          youtube_url: youtubeUrl.trim() || null,
          is_public: isPublic,
        });
      }}
      className="rounded-lg border border-primary/30 bg-card p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{routine ? 'Edit routine' : 'New routine'}</h4>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-muted-foreground hover:bg-secondary">
          <X className="h-4 w-4" />
        </button>
      </div>

      <input
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <textarea
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Short description"
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          value={workoutType}
          onChange={(e) => setWorkoutType(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {['GYM_PUSH', 'GYM_PULL', 'GYM_LEGS', 'GYM_UPPER', 'GYM_LOWER', 'GYM_FULL', 'RUN', 'WALK', 'SPORT', 'OTHER'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED')}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Exercises <span className="text-muted-foreground/60">(one per line)</span>
        </label>
        <textarea
          rows={4}
          value={exercisesText}
          onChange={(e) => setExercisesText(e.target.value)}
          placeholder="Bench Press&#10;Overhead Press&#10;Tricep Pushdown"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>
      <input
        type="url"
        value={youtubeUrl}
        onChange={(e) => setYoutubeUrl(e.target.value)}
        placeholder="YouTube URL (optional)"
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
        Public (visible in Explore)
      </label>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={save.isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {save.isPending ? 'Saving…' : routine ? 'Update' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
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

// ── Broadcast tab ───────────────────────────────────────────────────────────
function BroadcastTab() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/app');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const send = useMutation({
    mutationFn: () =>
      apiClient<ApiResponse<{ sent: number; recipients: number }>>('/admin', {
        method: 'POST',
        params: { resource: 'push' },
        body: { title: title.trim(), body: body.trim(), url: url.trim() || '/app' },
      }),
    onSuccess: (res) => {
      setResult({
        ok: true,
        text: `Sent to ${res.data.sent} device${res.data.sent === 1 ? '' : 's'} across ${res.data.recipients} user${res.data.recipients === 1 ? '' : 's'}.`,
      });
      setTitle('');
      setBody('');
    },
    onError: (err: Error) => setResult({ ok: false, text: err.message }),
  });

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-mental" />
        <h3 className="text-base font-semibold">Send a push notification to all users</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Goes out to every device with notifications enabled. Use sparingly — this is the kind of thing that gets people to mute the app.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || !body.trim()) {
            setResult({ ok: false, text: 'Title and body are required.' });
            return;
          }
          if (window.confirm(`Send "${title}" to all users with notifications enabled?`)) {
            send.mutate();
          }
        }}
        className="rounded-lg border border-border bg-card p-5 space-y-4"
      >
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={50}
            placeholder="ShakerSplit just got better"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">{title.length}/50</p>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={200}
            placeholder="We added mental health logging and friend requests. Try them out."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">{body.length}/200</p>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Deep link <span className="text-muted-foreground/60">(opens when tapped)</span>
          </label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="/app/log/mental"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <button
          type="submit"
          disabled={send.isPending || !title.trim() || !body.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {send.isPending ? 'Sending…' : 'Send to all users'}
        </button>
      </form>

      {result && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            result.ok ? 'bg-food/10 text-food' : 'bg-destructive/10 text-destructive'
          }`}
        >
          {result.text}
        </div>
      )}
    </div>
  );
}
