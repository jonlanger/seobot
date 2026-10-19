import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ToastVariant = "neutral" | "success" | "warning" | "danger" | "info";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Auto-dismiss delay in ms. */
  duration?: number;
}

interface Toast extends Required<Pick<ToastOptions, "title" | "variant" | "duration">> {
  id: number;
  description?: string;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = ++counter.current;
      const next: Toast = {
        id,
        variant: options.variant ?? "neutral",
        duration: options.duration ?? 5000,
        title: options.title,
        description: options.description,
      };
      setToasts((current) => [...current, next]);
      if (next.duration > 0) {
        window.setTimeout(() => dismiss(id), next.duration);
      }
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-100 flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} toast={item} onDismiss={() => dismiss(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within <ToastProvider>.");
  return context;
}

const variantStyles: Record<ToastVariant, { icon: typeof Info; className: string }> = {
  neutral: { icon: Info, className: "text-muted-foreground" },
  info: { icon: Info, className: "text-info-soft-foreground" },
  success: { icon: CircleCheck, className: "text-success-soft-foreground" },
  warning: { icon: TriangleAlert, className: "text-warning-soft-foreground" },
  danger: { icon: CircleAlert, className: "text-destructive-soft-foreground" },
};

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const { icon: Icon, className } = variantStyles[toast.variant];

  return (
    <div
      data-slot="toast"
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border bg-surface p-4 text-surface-foreground shadow-lg animate-toast-in"
    >
      <Icon aria-hidden className={cn("mt-0.5 size-4.5 shrink-0", className)} />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <div className="text-sm font-medium leading-snug">{toast.title}</div>
        {toast.description && (
          <div className="text-sm leading-relaxed text-muted-foreground">{toast.description}</div>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
        className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-ring"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
