import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import api from "../../lib/api";
import YearSelector from "./YearSelector";
import ContributionHeatmap, { HeatmapSkeleton } from "./ContributionHeatmap";

/**
 * ActivityTab
 *
 * Content for the "Activity" tab on the profile page.
 *
 * MVP scope: heading + year selector + contribution heatmap only. No
 * stats cards, no activity graph, no streaks, no leaderboards — those
 * are intentionally left out of this iteration.
 *
 * Year handling:
 *   - Available years come from GET /api/users/:username/contribution-years,
 *     computed live from Contribution documents — never hardcoded.
 *   - Default selection is the newest available year (years[0], since the
 *     endpoint returns them newest-first), never the current calendar
 *     year unless data actually exists for it.
 *   - Switching years just updates local state and re-fetches the
 *     heatmap for that year — no route change, no reload.
 *
 * The layout below is just a vertical stack of <section> blocks. Future
 * additions (stats cards, contribution trends, activity graph, etc.) can
 * be inserted as additional sections — above or below the heatmap —
 * without requiring a redesign of this wrapper.
 */
export default function ActivityTab({ username }) {
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [yearsLoading, setYearsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchYears = async () => {
      setYearsLoading(true);

      try {
        const res = await api.get(`/api/users/${username}/contribution-years`);
        if (!cancelled) {
          const fetchedYears = res.data.years ?? [];
          setYears(fetchedYears);
          // Newest available contribution year — not necessarily this
          // calendar year — is always the default.
          setSelectedYear(fetchedYears[0] ?? null);
        }
      } catch {
        if (!cancelled) {
          setYears([]);
          setSelectedYear(null);
        }
      } finally {
        if (!cancelled) setYearsLoading(false);
      }
    };

    fetchYears();
    return () => {
      cancelled = true;
    };
  }, [username]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Activity & Insights</h2>

      {/* Future: stats cards section goes here */}

      <section className="space-y-5">
        {yearsLoading ? (
          <HeatmapSkeleton />
        ) : (
          <>
            <YearSelector years={years} active={selectedYear} onChange={setSelectedYear} />

            {/* Reuses the same fade/slide used for the Collections ↔
                Activity tab switch, keyed by year so it replays whenever
                a different year is picked. */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedYear ?? "no-data"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <ContributionHeatmap username={username} year={selectedYear} />
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </section>

      {/* Future: activity graph / trends section goes here */}
    </div>
  );
}