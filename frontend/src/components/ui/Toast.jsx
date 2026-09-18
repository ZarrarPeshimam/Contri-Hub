/**
 * Toast.jsx + useToast hook
 *
 * Minimal self-contained toast/snackbar system.
 * No external library needed — keeps the bundle lean.
 *
 * Usage:
 *   const { toasts, showToast, dismiss } = useToast();
 *   showToast("Saved!", "success");
 *   showToast("Something failed", "error");
 *
 *   // In JSX:
 *   <ToastContainer toasts={toasts} dismiss={dismiss} />
 *   // or, for a bottom-right placement:
 *   <ToastContainer toasts={toasts} dismiss={dismiss} position="bottom-right" />
 *
 * Toast types: "success" | "error" | "info"
 * Auto-dismisses after 4 s.
 */

import { useState, useCallback } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

/* ── Hook ── */

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismiss };
}

/* ── Container ── */

const POSITION_CLASSES = {
  "bottom-center": "bottom-6 left-1/2 -translate-x-1/2 items-center",
  "bottom-right":  "bottom-6 right-6 items-end",
};

export function ToastContainer({ toasts, dismiss, position = "bottom-center" }) {
  if (!toasts.length) return null;
  const posClass = POSITION_CLASSES[position] ?? POSITION_CLASSES["bottom-center"];
  return (
    <div className={`fixed z-[100] flex flex-col gap-2 pointer-events-none ${posClass}`}>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  );
}

/* ── Single item ── */

const STYLES = {
  success: { Icon: CheckCircle, bar: "bg-green-500", text: "text-green-400", border: "border-green-500/30" },
  error:   { Icon: XCircle,     bar: "bg-red-500",   text: "text-red-400",   border: "border-red-500/30"   },
  info:    { Icon: Info,        bar: "bg-violet-500", text: "text-violet-400",border: "border-violet-500/30"},
};

function ToastItem({ toast, onDismiss }) {
  const { Icon, bar, text, border } = STYLES[toast.type] ?? STYLES.info;
  return (
    <div className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border ${border} bg-gray-900 shadow-2xl min-w-[260px] max-w-sm`}>
      <div className={`w-1 self-stretch rounded-full ${bar} shrink-0`} />
      <Icon className={`w-4 h-4 shrink-0 ${text}`} />
      <span className="text-sm text-gray-200 flex-1">{toast.message}</span>
      <button onClick={() => onDismiss(toast.id)} className="shrink-0 text-gray-500 hover:text-gray-300 transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}