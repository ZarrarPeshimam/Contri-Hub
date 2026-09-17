import { useEffect, useRef, useState } from "react";
import api from "../../lib/api";
import YearSelector from "./YearSelector";
import ContributionHeatmap, { HeatmapSkeleton } from "./ContributionHeatmap";
import ActivityStatsCards from "./ActivityStatsCards";
import ContributionTrendGraph from "./ContributionTrendGraph";

/**
 * ActivityTab
 *
 * Content for the "Activity" tab on the profile page. Renders, top to
 * bottom: stat cards → the existing GitHub-style heatmap (untouched,
 * reused as-is) → a time-series contribution trend chart.
 *
 * Year handling:
 *   - Available years come from GET /api/users/:username/contribution-years,
 *     computed live from Contribution documents — never hardcoded.
 *   - Default selection is the newest available year (years[0], since the
 *     endpoint returns them newest-first), never the current calendar
 *     year unless data actually exists for it.
 *   - Switching years just updates local state and re-fetches both the
 *     heatmap AND the trend graph for that year — no route change, no
 *     reload. Both consume the exact same server-side window logic
 *     (see backend/utils/contributionWindow.js), so they always stay in
 *     sync: rolling 365-day window for the newest year, full calendar
 *     year for anything older.
 *
 * The stats cards are independent of the selected year — they always
 * reflect all-time data, so they don't re-fetch when `selectedYear`
 * changes.
 *
 * Heatmap transition:
 *   - `ContributionHeatmap` owns its own stable outer card and animates
 *     only its inner grid — see that component for why. This tab's job
 *     is just to compute *which way* that inner animation should move.
 *   - `prevYearRef` remembers the previously-selected year outside of
 *     React state, purely so any click (including a fast sequence of
 *     clicks) can diff the new year against it and derive a direction —
 *     a plain numeric comparison, so it works for any number/order of
 *     years, not a fixed set of cases. That direction is passed straight
 *     through to `ContributionHeatmap` as a prop.
 */
export default function ActivityTab({ username }) {
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [yearsLoading, setYearsLoading] = useState(true);
  const [slideDirection, setSlideDirection] = useState(0);

  // Previously-selected year, tracked in a ref (not state) so it updates
  // synchronously and survives re-renders without itself triggering one.
  const prevYearRef = useRef(null);

  const handleYearChange = (newYear) => {
    const previousYear = prevYearRef.current;
    if (previousYear != null && newYear != null && newYear !== previousYear) {
      // Later year -> incoming heatmap enters from the right.
      // Earlier year -> incoming heatmap enters from the left.
      setSlideDirection(newYear > previousYear ? 1 : -1);
    }
    prevYearRef.current = newYear;
    setSelectedYear(newYear);
  };

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
          // calendar year — is always the default. No directional cue
          // on initial load.
          const defaultYear = fetchedYears[0] ?? null;
          prevYearRef.current = defaultYear;
          setSlideDirection(0);
          setSelectedYear(defaultYear);
        }
      } catch {
        if (!cancelled) {
          setYears([]);
          prevYearRef.current = null;
          setSlideDirection(0);
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

      <section>
        <ActivityStatsCards username={username} />
      </section>

      <section className="space-y-5">
        {yearsLoading ? (
          <HeatmapSkeleton />
        ) : (
          <>
            <YearSelector years={years} active={selectedYear} onChange={handleYearChange} />

            {/* No key/remount here, and no AnimatePresence at this level
                — ContributionHeatmap is a single persistent instance
                across year switches. It keeps its own outer card static
                and animates only its inner grid, using `direction` below
                to decide which way that inner cross-fade moves. This is
                what stops the whole card (and everything below it) from
                collapsing/jerking on every switch. */}
            <ContributionHeatmap username={username} year={selectedYear} direction={slideDirection} />
          </>
        )}
      </section>

      <section>
        <ContributionTrendGraph username={username} year={selectedYear} />
      </section>
    </div>
  );
}