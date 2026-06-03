import type { FoodLog } from '../types/food-log.types';
import { formatDate, formatTime } from '@/lib/utils';
import { Trash2 } from 'lucide-react';

interface FoodLogCardProps {
  log: FoodLog;
  onDelete?: (id: string) => void;
}

export function FoodLogCard({ log, onDelete }: FoodLogCardProps) {
  return (
    <div className="rounded-lg border border-border border-l-4 border-l-food bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <span className="inline-block rounded bg-food/20 px-2 py-0.5 text-xs font-medium text-food">
            {log.meal_type.replace('_', ' ')}
          </span>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(log.logged_at)} at {formatTime(log.logged_at)}
          </p>
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(log.id)}
            className="rounded p-1 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <ul className="mt-2 space-y-1">
        {log.food_items.map((item, i) => (
          <li key={i} className="text-sm">
            <span className="font-medium">{item.name}</span>
            <span className="text-muted-foreground"> — {item.quantity}</span>
            {item.calories && <span className="text-muted-foreground"> ({item.calories} cal)</span>}
          </li>
        ))}
      </ul>

      {(log.total_calories || log.total_protein_g) && (
        <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
          {log.total_calories && <span>{log.total_calories} cal total</span>}
          {log.total_protein_g && <span>{log.total_protein_g}g protein</span>}
        </div>
      )}

      {log.notes && <p className="mt-2 text-xs italic text-muted-foreground">{log.notes}</p>}
    </div>
  );
}
