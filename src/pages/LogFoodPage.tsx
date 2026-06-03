import { FoodLogForm, FoodLogList } from '@/features/food-log';
import { UtensilsCrossed } from 'lucide-react';

export function LogFoodPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <UtensilsCrossed className="h-5 w-5 text-food" />
        <h2 className="text-xl font-bold">Log Food</h2>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 md:p-6">
        <FoodLogForm />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Recent Logs</h3>
        <FoodLogList />
      </div>
    </div>
  );
}
