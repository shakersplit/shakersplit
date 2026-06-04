import { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  /** Auto-dismiss after this many ms. Default 4000. Pass 0 to disable. */
  duration?: number;
  /** Optional action: tap to retry / view / etc. */
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  /**
   * Show a toast. Shorthand helpers (success/error/info) are usually nicer to call.
   * Returns the toast id so the caller can dismiss it programmatically if needed.
   */
  show: (toast: Omit<Toast, 'id'>) => number;
  success: (message: string, opts?: Partial<Omit<Toast, 'id' | 'kind' | 'message'>>) => number;
  error: (message: string, opts?: Partial<Omit<Toast, 'id' | 'kind' | 'message'>>) => number;
  info: (message: string, opts?: Partial<Omit<Toast, 'id' | 'kind' | 'message'>>) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Bump on every show() so each toast has a unique key. */
let nextId = 1;

/**
 * App-wide toast provider. Renders a stack at bottom-right (bottom-center on mobile).
 * Stacks at most 4 toasts; older ones auto-dismiss to make room.
 *
 * Use via the useToast() hook anywhere inside <ToastProvider>.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((toast: Omit<Toast, 'id'>): number => {
    const id = nextId++;
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const success = useCallback(
    (message: string, opts?: Partial<Omit<Toast, 'id' | 'kind' | 'message'>>) =>
      show({ kind: 'success', message, ...(opts ?? {}) }),
    [show],
  );
  const error = useCallback(
    (message: string, opts?: Partial<Omit<Toast, 'id' | 'kind' | 'message'>>) =>
      show({ kind: 'error', message, ...(opts ?? {}) }),
    [show],
  );
  const info = useCallback(
    (message: string, opts?: Partial<Omit<Toast, 'id' | 'kind' | 'message'>>) =>
      show({ kind: 'info', message, ...(opts ?? {}) }),
    [show],
  );

  return (
    <ToastContext.Provider value={{ show, success, error, info, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-24 left-1/2 z-[70] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 lg:bottom-6 lg:left-auto lg:right-6 lg:translate-x-0"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [exiting, setExiting] = useState(false);

  // Mount-time slide-in animation via opacity transition.
  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      // no-op, exists to ensure the initial 'opacity-0' applies before the transition
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  const accent =
    toast.kind === 'success'
      ? 'border-food/40 bg-food/10 text-food'
      : toast.kind === 'error'
      ? 'border-destructive/40 bg-destructive/10 text-destructive'
      : 'border-mental/40 bg-mental/10 text-mental';

  const Icon = toast.kind === 'success' ? CheckCircle2 : toast.kind === 'error' ? AlertCircle : Info;

  return (
    <div
      role={toast.kind === 'error' ? 'alert' : 'status'}
      aria-live={toast.kind === 'error' ? 'assertive' : 'polite'}
      className={`pointer-events-auto flex items-start gap-2 rounded-xl border bg-card px-3 py-2.5 shadow-lg backdrop-blur transition-all duration-200 ${accent} ${
        exiting ? 'translate-y-2 opacity-0' : 'opacity-100'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug text-foreground">{toast.message}</p>
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              setExiting(true);
              setTimeout(() => onDismiss(toast.id), 200);
            }}
            className="mt-1 text-xs font-medium underline underline-offset-2 hover:no-underline"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => {
          setExiting(true);
          setTimeout(() => onDismiss(toast.id), 200);
        }}
        aria-label="Dismiss"
        className="rounded p-0.5 text-muted-foreground hover:bg-secondary"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
