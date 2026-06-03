import { useQuery } from '@tanstack/react-query';
import { Newspaper, UtensilsCrossed, Dumbbell, Wine, Scale, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface FeedItem {
  user_id: string;
  kind: 'food' | 'workout' | 'alcohol' | 'weight';
  id: string;
  logged_at: string;
  payload: Record<string, unknown>;
}

interface FeedItemEnriched extends FeedItem {
  user: { id: string; display_name: string | null; email: string; avatar_url: string | null };
}

/**
 * Activity feed — shows the last 50 shared logs from the current user's accepted friends.
 * Reads directly from the `friend_activity_feed` view (RLS enforces friend-only visibility);
 * we then enrich each row with the friend's display info via a single users SELECT.
 */
export function ActivityFeedPage() {
  const { data: feed, isLoading, error } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: async (): Promise<FeedItemEnriched[]> => {
      const { data: rows, error: feedErr } = await supabase
        .from('friend_activity_feed')
        .select('*')
        .order('logged_at', { ascending: false })
        .limit(50);
      if (feedErr) throw feedErr;
      const items = (rows ?? []) as FeedItem[];
      if (items.length === 0) return [];

      // Batch-fetch user info.
      const userIds = Array.from(new Set(items.map((r) => r.user_id)));
      const { data: users } = await supabase
        .from('users')
        .select('id, display_name, email, avatar_url')
        .in('id', userIds);
      const userMap = new Map((users ?? []).map((u) => [u.id, u]));

      return items.map((it) => ({
        ...it,
        user: userMap.get(it.user_id) ?? { id: it.user_id, display_name: null, email: '', avatar_url: null },
      }));
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Newspaper className="h-5 w-5" />
        <h2 className="text-xl font-bold">Activity Feed</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Shows logs your friends choose to share. To share your own logs, toggle the share option on each entry's form, or set a default in Profile.
      </p>

      {error ? (
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          Couldn't load feed: {(error as Error).message}
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-secondary" />)}
        </div>
      ) : !feed || feed.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">No activity yet.</p>
          <p className="text-xs text-muted-foreground">
            Add friends in <Link to="/app/friends" className="text-primary hover:underline">Friends</Link>, and ask them to share their logs.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {feed.map((item) => (
            <FeedCard key={`${item.kind}-${item.id}`} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

function FeedCard({ item }: { item: FeedItemEnriched }) {
  const name = item.user.display_name || item.user.email.split('@')[0] || 'Someone';
  const initial = name[0]?.toUpperCase() ?? '?';
  const p = item.payload;

  return (
    <li className={`rounded-lg border-l-4 border border-border bg-card p-4 ${KIND_BORDER[item.kind]}`}>
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold shrink-0">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium truncate">{name}</span>
            <KindBadge kind={item.kind} />
            <span className="text-xs text-muted-foreground">· {timeAgo(item.logged_at)}</span>
          </div>
          <FeedBody kind={item.kind} payload={p} />
        </div>
      </div>
    </li>
  );
}

const KIND_BORDER: Record<FeedItem['kind'], string> = {
  food: 'border-l-food',
  workout: 'border-l-workout',
  alcohol: 'border-l-alcohol',
  weight: 'border-l-mental',
};

function KindBadge({ kind }: { kind: FeedItem['kind'] }) {
  const map: Record<FeedItem['kind'], { Icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
    food: { Icon: UtensilsCrossed, label: 'food', color: 'text-food' },
    workout: { Icon: Dumbbell, label: 'workout', color: 'text-workout' },
    alcohol: { Icon: Wine, label: 'drinks', color: 'text-alcohol' },
    weight: { Icon: Scale, label: 'weight', color: 'text-mental' },
  };
  const { Icon, label, color } = map[kind];
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${color}`}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

function FeedBody({ kind, payload }: { kind: FeedItem['kind']; payload: Record<string, unknown> }) {
  switch (kind) {
    case 'food': {
      const items = (payload.items ?? []) as Array<{ name?: string; quantity?: string }>;
      const photoUrl = payload.photo_url as string | null | undefined;
      const calories = payload.calories as number | null | undefined;
      const mealType = (payload.meal_type as string | undefined)?.replace('_', ' ');
      return (
        <div className="mt-1">
          <p className="text-sm">
            {mealType && <span className="text-xs uppercase text-muted-foreground mr-1">{mealType}</span>}
            {items.slice(0, 3).map((i) => i.name).filter(Boolean).join(', ') || 'logged a meal'}
            {items.length > 3 && ` +${items.length - 3}`}
            {calories ? ` · ${Math.round(calories)} cal` : ''}
          </p>
          {photoUrl && <img src={photoUrl} alt="" className="mt-2 max-w-[200px] rounded-lg object-cover" loading="lazy" />}
        </div>
      );
    }
    case 'workout': {
      const wt = (payload.workout_type as string | undefined)?.replace(/_/g, ' ');
      const dur = payload.duration_minutes as number | undefined;
      const cal = payload.calories_burned as number | undefined;
      return (
        <p className="mt-1 text-sm">
          {wt ?? 'Workout'} · {dur ? `${dur} min` : 'session'}
          {cal ? ` · ~${Math.round(cal)} cal` : ''}
        </p>
      );
    }
    case 'alcohol': {
      const spirit = payload.spirit_type as string | undefined;
      const ml = payload.quantity_ml as number | undefined;
      return (
        <p className="mt-1 text-sm">
          {spirit ?? 'Drink'} {ml ? `· ${ml} ml` : ''}
        </p>
      );
    }
    case 'weight': {
      const kg = payload.weight_kg as number | undefined;
      const bf = payload.body_fat_pct as number | null | undefined;
      return (
        <p className="mt-1 text-sm">
          {kg ? `${kg} kg` : 'weight log'}
          {bf ? ` · ${bf}% bf` : ''}
        </p>
      );
    }
    default:
      return null;
  }
}
