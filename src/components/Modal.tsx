"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClassName?: string;
}

export default function Modal({ title, onClose, children, maxWidthClassName = "max-w-md" }: ModalProps) {
  // Lazy initializer, not an effect: false only during a hypothetical SSR pass
  // (document undefined server-side), true on the actual client render — no extra
  // render cycle and no setState-in-effect.
  const [mounted] = useState(() => typeof document !== "undefined");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!mounted) return null;

  // Rendered into document.body via a portal — some triggers (e.g. the header's user
  // menu) live inside an ancestor with backdrop-filter/transform, which creates a CSS
  // containing block and would silently break `fixed inset-0` if this stayed in place.
  // A portal makes this modal's positioning immune to wherever it's opened from.
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-void/70 backdrop-blur-sm animate-fade-up"
        style={{ animationDuration: "200ms" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${maxWidthClassName} glass-raised p-6 max-h-[85vh] overflow-y-auto animate-popover-in origin-center`}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-mist hover:text-white active:scale-90 transition-transform"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
