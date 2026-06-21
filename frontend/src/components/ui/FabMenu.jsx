import { useState, useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";

/**
 * FabMenu
 *
 * A reusable floating action button that expands into a vertical stack
 * of labelled action buttons above it.
 *
 * Props:
 *   actions — array of { label: string, icon?: ReactNode, onClick: fn }
 *
 * Add more actions later without touching this component.
 */
export default function FabMenu({ actions = [] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click / tap
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleAction = (onClick) => {
    setOpen(false);
    onClick();
  };

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
    >
      {/* Action items — rendered bottom-to-top via flex-col-reverse */}
      <div className="flex flex-col-reverse gap-3 items-end">
        {actions.map((action, i) => (
          <div
            key={action.label}
            className="flex items-center gap-3"
            style={{
              opacity: open ? 1 : 0,
              transform: open ? "translateY(0)" : "translateY(12px)",
              transition: `opacity 200ms ease, transform 200ms ease`,
              transitionDelay: open
                ? `${i * 55}ms`
                : `${(actions.length - 1 - i) * 40}ms`,
              pointerEvents: open ? "auto" : "none",
            }}
          >
            {/* Label pill */}
            <span className="px-3 py-1.5 rounded-full bg-gray-900 border border-white/10 text-sm font-medium text-gray-100 shadow-lg whitespace-nowrap select-none">
              {action.label}
            </span>

            {/* Icon button */}
            <button
              onClick={() => handleAction(action.onClick)}
              aria-label={action.label}
              className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform duration-150 active:scale-95 bg-violet-600 hover:bg-violet-500 text-white shadow-violet-900/50"
            >
              {action.icon ?? (
                <span className="text-lg font-light leading-none">+</span>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Main FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close actions menu" : "Open actions menu"}
        aria-expanded={open}
        className={`
          w-14 h-14 rounded-full flex items-center justify-center
          shadow-xl transition-all duration-250 active:scale-95
          ${open
            ? "bg-gray-700 hover:bg-gray-600 shadow-black/40 rotate-45"
            : "bg-violet-600 hover:bg-violet-500 shadow-violet-900/50 rotate-0"
          }
          text-white
        `}
        style={{ transition: "background-color 200ms ease, transform 250ms cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        {open ? <X className="w-5 h-5" /> : <Plus className="w-6 h-6" />}
      </button>
    </div>
  );
}