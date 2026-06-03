import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Heart,
  Plus,
  Smile,
  Meh,
  Frown,
  Trash2,
  Moon,
} from 'lucide-react';
import {
  getMentalHealthLogs,
  createMentalHealthLog,
  deleteMentalHealthLog,
} from '@/features/mental-health-log';
import type { MentalHealthLog } from '@/features/mental-health-log';
import { formatDate } from '@/lib/utils';
import { AIQuickLogBar } from '@/components/ai/AIQuickLogBar';

interface AIMentalResponse {
  mood_score: number;
  sleep_hours?: number;
  sleep_quality?: number;
  journal_entry: string | null;
  tags: string[];
  confidence: 'high' | 'medium' | 'low';
}

const MOOD_DESCRIPTORS: Record<number, string> = {
  1: 'Very low', 2: 'Low', 3: 'Down', 4: 'Off', 5: 'Neutral',
  6: 'Okay', 7: 'Good', 8: 'Great', 9: 'Excellent', 10: 'Amazing',
};

/**
 * Maps mood score 1-10 to a face icon + color band so the UI feels supportive
 * rather than clinical. Threshold cutoffs are intentionally generous toward
 * the higher end so a "just okay" day doesn't get a frown.
 */
function moodFace(score: number) {
  if (score >= 7) return { Icon: Smile, color: 'text-food', bg: 'bg-food/10' };
  if (score >= 4) return { Icon: Meh, color: 'text-workout', bg: 'bg-workout/10' };
  return { Icon: Frown, color: 'text-alcohol', bg: 'bg-alcohol/10' };
}

export function LogMentalHealthPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [moodScore, setMoodScore] = useState(7);
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [journal, setJournal] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState('');

  const { data: logsResp, isLoading } = useQuery({
    queryKey: ['mental-health-logs'],
    queryFn: () => getMentalHealthLogs({ limit: 60 }),
  });

  const create = useMutation({
    mutationFn: createMentalHealthLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mental-health-logs'] });
      setShowForm(false);
      setMoodScore(7);
      setSleepHours('');
      setSleepQuality(null);
      setJournal('');
      setTags([]);
      setTagInput('');
      setError('');
    },
    onError: (err: Error) => setError(err.message ?? 'Failed to save'),
  });

  const remove = useMutation({
    mutationFn: deleteMentalHealthLog,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mental-health-logs'] }),
  });

  const logs = logsResp?.data ?? [];

  const handleAddTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (tags.includes(t)) { setTagInput(''); return; }
    if (tags.length >= 20) {
      setError('Maximum 20 tags per entry.');
      return;
    }
    setTags([...tags, t]);
    setTagInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (moodScore < 1 || moodScore > 10) {
      setError('Mood must be 1–10');
      return;
    }
    const sh = sleepHours ? parseFloat(sleepHours) : undefined;
    if (sh !== undefined && (sh < 0 || sh > 24)) {
      setError('Sleep hours must be between 0 and 24');
      return;
    }
    create.mutate({
      mood_score: moodScore,
      sleep_hours: sh,
      sleep_quality: sleepQuality ?? undefined,
      journal_entry: journal.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-mental" />
          <h2 className="text-xl font-bold">Mental Health</h2>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {showForm ? 'Cancel' : 'Log mood'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-5 space-y-5">
          <AIQuickLogBar<AIMentalResponse>
            endpoint="/mental-health-logs"
            placeholder="e.g. slept 7 hours, feeling pretty good but anxious about Monday"
            onParsed={(parsed) => {
              setMoodScore(parsed.mood_score);
              if (parsed.sleep_hours !== undefined) setSleepHours(parsed.sleep_hours.toString());
              if (parsed.sleep_quality !== undefined) setSleepQuality(parsed.sleep_quality);
              if (parsed.journal_entry) setJournal(parsed.journal_entry);
              if (Array.isArray(parsed.tags) && parsed.tags.length > 0) setTags(parsed.tags.slice(0, 20));
            }}
          />

          {/* Mood scale 1-10 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">How are you feeling?</label>
              <span className="text-xs text-muted-foreground">
                {moodScore}/10 · {MOOD_DESCRIPTORS[moodScore] ?? 'Unknown'}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={moodScore}
              onChange={(e) => setMoodScore(Number(e.target.value))}
              className="w-full accent-mental"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>1</span><span>5</span><span>10</span>
            </div>
          </div>

          {/* Sleep */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Sleep hours</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                placeholder="7.5"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Sleep quality</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setSleepQuality(sleepQuality === q ? null : q)}
                    className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                      sleepQuality === q
                        ? 'border-mental bg-mental/15 text-mental'
                        : 'border-border text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Journal */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Journal entry <span className="text-muted-foreground/60">(private, optional)</span>
            </label>
            <textarea
              rows={4}
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Tags <span className="text-muted-foreground/60">(e.g. anxious, focused, grateful)</span>
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Press Enter to add"
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-secondary"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTags(tags.filter((tag) => tag !== t))}
                    className="inline-flex items-center gap-1 rounded-full bg-mental/10 text-mental px-2.5 py-0.5 text-xs hover:bg-mental/20"
                    aria-label={`Remove ${t}`}
                  >
                    {t} ×
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={create.isPending}
            className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {create.isPending ? 'Saving…' : 'Save mood entry'}
          </button>
        </form>
      )}

      {/* History */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">History</h3>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-20 animate-pulse rounded-lg bg-secondary" />
            <div className="h-20 animate-pulse rounded-lg bg-secondary" />
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
            <Heart className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No mood entries yet.</p>
            <p className="text-xs text-muted-foreground">Logging mood + sleep helps spot patterns over time.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {logs.map((log: MentalHealthLog) => {
              const { Icon, color, bg } = moodFace(log.mood_score);
              return (
                <li
                  key={log.id}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${bg} shrink-0`}>
                        <Icon className={`h-5 w-5 ${color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {log.mood_score}/10 · {MOOD_DESCRIPTORS[log.mood_score] ?? 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span>{formatDate(log.logged_at)}</span>
                          {log.sleep_hours !== null && (
                            <span className="inline-flex items-center gap-1">
                              <Moon className="h-3 w-3" /> {log.sleep_hours}h
                              {log.sleep_quality && ` · q${log.sleep_quality}/5`}
                            </span>
                          )}
                        </p>
                        {log.tags && log.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {log.tags.map((t) => (
                              <span key={t} className="rounded-full bg-mental/10 text-mental px-2 py-0.5 text-xs">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {log.journal_entry && (
                          <p className="mt-2 text-xs italic text-muted-foreground line-clamp-3">
                            {log.journal_entry}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this mood entry?')) remove.mutate(log.id);
                      }}
                      aria-label="Delete entry"
                      className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
