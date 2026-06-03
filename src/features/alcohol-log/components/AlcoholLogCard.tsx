import type { AlcoholLog } from '../types/alcohol-log.types';
import { formatDate, formatTime } from '@/lib/utils';
import { Trash2, Droplets, UtensilsCrossed } from 'lucide-react';

interface AlcoholLogCardProps {
  log: AlcoholLog;
  onDelete?: (id: string) => void;
}

export function AlcoholLogCard({ log, onDelete }: AlcoholLogCardProps) {
  return (
    <div className="rounded-lg border border-border border-l-4 border-l-alcohol bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <span className="inline-block rounded bg-alcohol/20 px-2 py-0.5 text-xs font-medium text-alcohol capitalize">
            {log.spirit_type}
          </span>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(log.logged_at)} at {formatTime(log.logged_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{log.quantity_ml} ml</span>
          {onDelete && (
            <button
              onClick={() => {
                if (window.confirm('Delete this drink entry?')) onDelete(log.id);
              }}
              aria-label="Delete entry"
              className="rounded p-1 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {log.mixer && <p className="mt-1 text-sm text-muted-foreground">+ {log.mixer}</p>}

      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        {log.pre_game_meal_eaten && (
          <span className="flex items-center gap-1 text-food">
            <UtensilsCrossed className="h-3 w-3" /> Pre-game meal ✓
          </span>
        )}
        {log.water_consumed_ml > 0 && (
          <span className="flex items-center gap-1 text-blue-400">
            <Droplets className="h-3 w-3" /> {log.water_consumed_ml}ml water
          </span>
        )}
        {log.intoxication_level && (
          <span className="text-muted-foreground">Drunk level: {log.intoxication_level}/5</span>
        )}
      </div>

      {log.notes && <p className="mt-2 text-xs italic text-muted-foreground">{log.notes}</p>}
    </div>
  );
}
