import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { ApiResponse } from '@/types';

interface AIQuickLogBarProps<T> {
  /**
   * API path to POST to with `?action=parse-ai`. e.g. '/food-logs', '/workout-logs'.
   */
  endpoint: string;
  /**
   * Friendly placeholder for the textarea. Should suggest the kinds of phrasing
   * the underlying parser handles best.
   */
  placeholder: string;
  /**
   * Receives the parsed structured response from Gemini. Caller's responsibility
   * to populate the form fields from it.
   */
  onParsed: (parsed: T) => void;
  /**
   * Header label shown next to the sparkles icon. Default 'Quick log with AI'.
   */
  label?: string;
}

/**
 * Reusable "Quick log with AI" bar — one-liner textarea + Parse button. Shared across
 * every log form (food, workout, alcohol, weight, mental health).
 *
 * Behavior:
 *   - Enter (without shift) submits.
 *   - Shows confidence hint after a successful parse so the user knows whether to verify.
 *   - On API failure (key not set, rate limit, parse error), surfaces the message inline
 *     and the form still works manually — never blocks the user.
 *   - Self-clears after a successful parse so the user can immediately edit the populated
 *     form without seeing their original text re-displayed.
 */
export function AIQuickLogBar<T extends { confidence?: 'high' | 'medium' | 'low' }>({
  endpoint,
  placeholder,
  onParsed,
  label = 'Quick log with AI',
}: AIQuickLogBarProps<T>) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low' | null>(null);

  const run = async () => {
    setErrorMsg('');
    setConfidence(null);
    if (!input.trim()) return;
    setLoading(true);
    try {
      const res = await apiClient<ApiResponse<T>>(endpoint, {
        method: 'POST',
        params: { action: 'parse-ai' },
        body: { description: input },
      });
      onParsed(res.data);
      setConfidence(res.data.confidence ?? null);
      setInput('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'AI parse failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-mental/30 bg-mental/5 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-mental">
        <Sparkles className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void run();
            }
          }}
          placeholder={placeholder}
          disabled={loading}
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <button
          type="button"
          onClick={run}
          disabled={loading || !input.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-mental px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? 'Parsing…' : 'Parse'}
        </button>
      </div>
      {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
      {confidence && (
        <p className="text-xs text-muted-foreground">
          Filled in below — review the values before saving.
          {confidence === 'low' && ' AI marked this as low confidence; double-check.'}
        </p>
      )}
    </div>
  );
}
