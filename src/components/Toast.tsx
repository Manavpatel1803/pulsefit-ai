"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

export type ToastVariant = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  title: string;
  message?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (title: string, options?: { message?: string; variant?: ToastVariant }) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_ACCENT: Record<ToastVariant, string> = {
  success: "var(--emerald)",
  error: "#f87171",
  info: "var(--indigo-glow)",
  warning: "var(--amber)",
};

const AUTO_DISMISS_MS = 4200;

function VariantIcon({ variant, color }: { variant: ToastVariant; color: string }) {
  const common = {
    fill: "none",
    height: 18,
    stroke: color,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2.4,
    viewBox: "0 0 24 24",
    width: 18,
  };
  if (variant === "success") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12.5l2.8 2.8L16 9.8" />
      </svg>
    );
  }
  if (variant === "error") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <path d="M15 9l-6 6M9 9l6 6" />
      </svg>
    );
  }
  if (variant === "warning") {
    return (
      <svg {...common}>
        <path d="M12 3l10 18H2L12 3z" />
        <path d="M12 10v5M12 18v.01" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v.01M12 12v5" />
    </svg>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (title: string, options?: { message?: string; variant?: ToastVariant }) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, title, message: options?.message, variant: options?.variant ?? "info" }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (title, message) => show(title, { message, variant: "success" }),
      error: (title, message) => show(title, { message, variant: "error" }),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col-reverse gap-2 items-center pointer-events-none px-4 w-full sm:w-auto sm:left-auto sm:right-5 sm:translate-x-0 sm:items-end">
        {toasts.map((t) => {
          const accent = VARIANT_ACCENT[t.variant];
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex items-start gap-3 glass-raised px-4 py-3 w-full sm:w-auto sm:min-w-[320px] sm:max-w-[420px] animate-toast-in"
              onClick={() => dismiss(t.id)}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: `${accent}22` }}
              >
                <VariantIcon variant={t.variant} color={accent} />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium text-white">{t.title}</span>
                {t.message && <span className="text-xs text-mist leading-relaxed">{t.message}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
