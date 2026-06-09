"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ConfirmContext = createContext<(opts: ConfirmOptions) => Promise<boolean>>(
  () => Promise.resolve(false)
);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...opts, resolve });
    });
  }, []);

  function handleConfirm() {
    state?.resolve(true);
    setState(null);
  }

  function handleCancel() {
    state?.resolve(false);
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <ConfirmDialogModal
          {...state}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useConfirm() {
  return useContext(ConfirmContext);
}

// ─── Dialog modal ─────────────────────────────────────────────────────────────

interface ModalProps extends ConfirmOptions {
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialogModal({
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = "danger",
  onConfirm,
  onCancel,
}: ModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus confirm button on open
  useEffect(() => {
    const t = setTimeout(() => confirmRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  // Escape = cancel
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const isDanger = variant === "danger";
  const isWarning = variant === "warning";

  const iconBg = isDanger
    ? "bg-red-500/10"
    : isWarning
    ? "bg-amber-500/10"
    : "bg-muted";

  const iconColor = isDanger
    ? "text-red-500"
    : isWarning
    ? "text-amber-500"
    : "text-muted-foreground";

  const Icon = isDanger ? Trash2 : AlertTriangle;

  const confirmBtnClass = isDanger
    ? "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
    : isWarning
    ? "bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-500"
    : "bg-primary hover:bg-primary/90 text-primary-foreground focus:ring-primary";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-in fade-in-0 duration-150"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        className={cn(
          "relative z-10 w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl",
          "animate-in fade-in-0 zoom-in-95 duration-150"
        )}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <div className="p-6">
          {/* Icon */}
          <div className={cn("w-11 h-11 rounded-full flex items-center justify-center mb-4", iconBg)}>
            <Icon size={20} className={iconColor} />
          </div>

          {/* Text */}
          <h2 id="confirm-title" className="text-[15px] font-semibold text-foreground mb-1.5 leading-snug">
            {title ?? (isDanger ? "Are you sure?" : "Confirm action")}
          </h2>
          <p id="confirm-message" className="text-sm text-muted-foreground leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-6 pb-5">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          >
            {cancelLabel ?? "Cancel"}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1",
              confirmBtnClass
            )}
          >
            {confirmLabel ?? (isDanger ? "Delete" : "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
