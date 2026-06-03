import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Check, X, Trash2, Inbox, Send, CheckCheck, Mail } from 'lucide-react';
import {
  getFriendships,
  sendFriendRequest,
  decideFriendship,
  removeFriendship,
} from '@/features/friendships';
import type { Friendship } from '@/features/friendships';

export function FriendsPage() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [submitMsg, setSubmitMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const { data: friendsResp, isLoading } = useQuery({
    queryKey: ['friendships'],
    queryFn: getFriendships,
  });

  const send = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      setEmail('');
      setSubmitMsg({ kind: 'ok', text: 'Request sent (if that email has an account, they\'ll see it).' });
      setTimeout(() => setSubmitMsg(null), 4000);
    },
    onError: (err: Error) => setSubmitMsg({ kind: 'err', text: err.message }),
  });

  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACCEPTED' | 'DECLINED' }) =>
      decideFriendship(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friendships'] }),
  });

  const remove = useMutation({
    mutationFn: removeFriendship,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friendships'] }),
  });

  const all = friendsResp?.data ?? [];
  const incoming = all.filter((f) => f.status === 'PENDING' && f.direction === 'incoming');
  const outgoing = all.filter((f) => f.status === 'PENDING' && f.direction === 'outgoing');
  const accepted = all.filter((f) => f.status === 'ACCEPTED');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5" />
        <h2 className="text-xl font-bold">Friends</h2>
      </div>

      {/* Add friend */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Add a friend</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Type their email address. If they have a ShakerSplit account, they'll get a request to confirm.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
            send.mutate(email.trim());
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={send.isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {send.isPending ? 'Sending…' : 'Send request'}
          </button>
        </form>
        {submitMsg && (
          <p
            className={`text-xs px-3 py-1.5 rounded-lg ${
              submitMsg.kind === 'ok' ? 'bg-food/10 text-food' : 'bg-destructive/10 text-destructive'
            }`}
          >
            {submitMsg.text}
          </p>
        )}
      </div>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <Section icon={<Inbox className="h-4 w-4 text-workout" />} title="Incoming requests" count={incoming.length}>
          <ul className="space-y-2">
            {incoming.map((f) => (
              <FriendRow
                key={f.id}
                f={f}
                actions={
                  <>
                    <button
                      onClick={() => decide.mutate({ id: f.id, status: 'ACCEPTED' })}
                      disabled={decide.isPending}
                      className="inline-flex items-center gap-1 rounded-lg bg-food px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" /> Accept
                    </button>
                    <button
                      onClick={() => decide.mutate({ id: f.id, status: 'DECLINED' })}
                      disabled={decide.isPending}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" /> Decline
                    </button>
                  </>
                }
              />
            ))}
          </ul>
        </Section>
      )}

      {/* Outgoing requests */}
      {outgoing.length > 0 && (
        <Section icon={<Send className="h-4 w-4 text-mental" />} title="Sent requests" count={outgoing.length}>
          <ul className="space-y-2">
            {outgoing.map((f) => (
              <FriendRow
                key={f.id}
                f={f}
                statusBadge={<span className="text-xs text-muted-foreground italic">Pending</span>}
                actions={
                  <button
                    onClick={() => {
                      if (window.confirm('Cancel this friend request?')) remove.mutate(f.id);
                    }}
                    disabled={remove.isPending}
                    aria-label="Cancel request"
                    className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                }
              />
            ))}
          </ul>
        </Section>
      )}

      {/* Accepted friends */}
      <Section icon={<CheckCheck className="h-4 w-4 text-food" />} title="Friends" count={accepted.length}>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-14 animate-pulse rounded-lg bg-secondary" />
            <div className="h-14 animate-pulse rounded-lg bg-secondary" />
          </div>
        ) : accepted.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center">
            <Users className="mx-auto h-7 w-7 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No friends yet.</p>
            <p className="text-xs text-muted-foreground">Send a request above to connect.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {accepted.map((f) => (
              <FriendRow
                key={f.id}
                f={f}
                actions={
                  <button
                    onClick={() => {
                      if (window.confirm(`Remove ${f.other_user.display_name || f.other_user.email} from friends?`)) {
                        remove.mutate(f.id);
                      }
                    }}
                    disabled={remove.isPending}
                    aria-label="Unfriend"
                    className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                }
              />
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">({count})</span>
      </div>
      {children}
    </div>
  );
}

function FriendRow({
  f,
  actions,
  statusBadge,
}: {
  f: Friendship;
  actions: React.ReactNode;
  statusBadge?: React.ReactNode;
}) {
  const name = f.other_user.display_name || f.other_user.email.split('@')[0] || f.other_user.email;
  return (
    <li className="flex items-center justify-between rounded-lg border border-border bg-card p-3 gap-2">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold shrink-0">
          {name[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground truncate">{f.other_user.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {statusBadge}
        {actions}
      </div>
    </li>
  );
}
