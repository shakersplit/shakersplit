import { AlcoholLogForm, AlcoholLogList } from '@/features/alcohol-log';
import { Wine } from 'lucide-react';

export function LogAlcoholPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Wine className="h-5 w-5 text-alcohol" />
        <h2 className="text-xl font-bold">Log Alcohol</h2>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 md:p-6">
        <AlcoholLogForm />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Recent Logs</h3>
        <AlcoholLogList />
      </div>
    </div>
  );
}
