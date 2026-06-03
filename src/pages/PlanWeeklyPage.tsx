import { useState } from 'react';
import { ClipboardList, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { usePlans, useCreatePlan, useCreatePlanEntry, useDeletePlanEntry } from '@/features/plans';
import type { PlanEntry } from '@/features/plans';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISODate(d: Date) {
  return d.toISOString().split('T')[0] ?? '';
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const CATEGORY_COLORS: Record<string, string> = {
  FOOD: 'bg-food/20 text-food border-food/30',
  WORKOUT: 'bg-workout/20 text-workout border-workout/30',
  ALCOHOL: 'bg-alcohol/20 text-alcohol border-alcohol/30',
};

export function PlanWeeklyPage() {
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [addEntryDay, setAddEntryDay] = useState<number | null>(null);
  const [newEntryText, setNewEntryText] = useState('');
  const [newEntryCategory, setNewEntryCategory] = useState<'FOOD' | 'WORKOUT' | 'ALCOHOL'>('FOOD');

  const weekStartStr = toISODate(weekStart);

  const { data: plansData, isLoading } = usePlans();
  const createPlan = useCreatePlan();

  const plan = plansData?.data?.find((p) => p.week_start_date === weekStartStr) ?? null;
  const planId = plan?.id ?? null;

  const createEntry = useCreatePlanEntry(planId ?? '');
  const deleteEntry = useDeletePlanEntry(planId ?? '');

  const { data: planDetail } = usePlans();
  const entries: PlanEntry[] = (planDetail?.data as unknown as { entries?: PlanEntry[] }[])?.find(
    (p: unknown) => (p as { week_start_date: string }).week_start_date === weekStartStr,
  )?.entries ?? [];

  const prevWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));

  const ensurePlanExists = async () => {
    if (planId) return planId;
    const res = await createPlan.mutateAsync({ week_start_date: weekStartStr });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((res as any).data?.id as string | undefined) ?? '';
  };

  const handleAddEntry = async (dayOfWeek: number) => {
    if (!newEntryText.trim()) return;
    const id = await ensurePlanExists();
    await createEntry.mutateAsync({
      day_of_week: dayOfWeek,
      category: newEntryCategory,
      content: { items: [newEntryText.trim()], meal_type: newEntryCategory } as never,
      notes: newEntryText.trim(),
    });
    setNewEntryText('');
    setAddEntryDay(null);
    void id;
  };

  const entriesForDay = (day: number) => entries.filter((e) => e.day_of_week === day);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          <h2 className="text-xl font-bold">Weekly Plan</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="rounded-lg border border-border p-2 hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium min-w-[140px] text-center">
            {toISODate(weekStart)} — {toISODate(addDays(weekStart, 6))}
          </span>
          <button
            onClick={nextWeek}
            className="rounded-lg border border-border p-2 hover:bg-secondary transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((d) => (
            <div key={d} className="h-32 animate-pulse rounded-lg bg-secondary" />
          ))}
        </div>
      ) : (
        <>
          {/* 7-day grid */}
          <div className="grid grid-cols-7 gap-2">
            {DAYS.map((day, idx) => {
              const dayEntries = entriesForDay(idx);
              const isToday =
                toISODate(addDays(weekStart, idx === 0 ? 0 : idx)) ===
                toISODate(addDays(weekStart, new Date().getDay() === 0 ? 0 : idx));
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(idx === selectedDay ? null : idx)}
                  className={`rounded-lg border text-left p-2 transition-colors hover:bg-secondary/50 ${
                    selectedDay === idx ? 'border-primary bg-secondary' : 'border-border bg-card'
                  }`}
                >
                  <p className={`text-xs font-semibold mb-1 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    {day}
                  </p>
                  <div className="space-y-1">
                    {dayEntries.slice(0, 2).map((e) => (
                      <div
                        key={e.id}
                        className={`truncate rounded px-1 py-0.5 text-xs border ${CATEGORY_COLORS[e.category]}`}
                      >
                        {e.notes || e.category}
                      </div>
                    ))}
                    {dayEntries.length > 2 && (
                      <p className="text-xs text-muted-foreground">+{dayEntries.length - 2}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Day Detail Panel */}
          {selectedDay !== null && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{DAY_LABELS[selectedDay]}</h3>
                <button
                  onClick={() => setAddEntryDay(selectedDay)}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>

              {/* Add entry form */}
              {addEntryDay === selectedDay && (
                <div className="rounded-lg border border-border p-3 space-y-3 bg-secondary/30">
                  <div className="flex gap-2">
                    {(['FOOD', 'WORKOUT', 'ALCOHOL'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setNewEntryCategory(cat)}
                        className={`rounded px-2 py-1 text-xs font-medium border transition-colors ${
                          newEntryCategory === cat
                            ? CATEGORY_COLORS[cat]
                            : 'border-border text-muted-foreground hover:bg-secondary'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <input
                    value={newEntryText}
                    onChange={(e) => setNewEntryText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddEntry(selectedDay)}
                    placeholder="What are you planning? (press Enter)"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddEntry(selectedDay)}
                      disabled={createEntry.isPending}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setAddEntryDay(null); setNewEntryText(''); }}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Entries */}
              <div className="space-y-2">
                {entriesForDay(selectedDay).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No plans for this day yet. Add one above!
                  </p>
                ) : (
                  entriesForDay(selectedDay).map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 ${CATEGORY_COLORS[entry.category]}`}
                    >
                      <div>
                        <span className="text-xs font-medium uppercase">{entry.category}</span>
                        <p className="text-sm">{entry.notes || JSON.stringify(entry.content)}</p>
                      </div>
                      <button
                        onClick={() => deleteEntry.mutate(entry.id)}
                        className="rounded p-1 opacity-60 hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
