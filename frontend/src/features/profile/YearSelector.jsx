import { motion } from "framer-motion";

/**
 * YearSelector
 *
 * Underline year navigation for the Activity tab's heatmap, visually
 * matching ProfileTabs (Collections/Activity) — amber underline,
 * no boxed buttons.
 *
 * `years` is expected to already be sorted newest-first (that's what the
 * /contribution-years endpoint returns). This component is purely
 * presentational: it doesn't fetch, sort, or default anything itself.
 */
export default function YearSelector({ years, active, onChange }) {
  if (!years.length) return null;

  return (
    <div
      role="tablist"
      aria-label="Contribution year"
      className="flex items-center gap-5 border-b border-white/[0.08]"
    >
      {years.map((year) => {
        const isActive = year === active;

        return (
          <button
            key={year}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(year)}
            className={`relative pb-2.5 pt-1 text-sm font-medium transition-colors outline-none cursor-pointer ${
              isActive ? "text-amber-400" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {year}

            {isActive && (
              <motion.div
                layoutId="year-selector-underline"
                className="absolute left-0 right-0 -bottom-px h-[2px] rounded-full bg-amber-400"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}