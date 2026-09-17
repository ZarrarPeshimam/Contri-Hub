import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import api from "../../lib/api";

/**
 * ContributionHeatmap
 *
 * GitHub-style contribution heatmap for the Activity tab.
 *
 * Data is fetched from GET /api/users/:username/activity-heatmap, which
 * computes counts dynamically from the Contribution collection — there is
 * no precomputed/cached heatmap data anywhere. This component is purely
 * presentational on top of that response.
 *
 * Layout stability:
 *   - The outer card (border, background, padding, header slot, legend
 *     footer) always renders with the same structure and a fixed
 *     `min-h`, for every state — first load, a year switch, or an error.
 *     It never unmounts or changes size, so nothing below it in the page
 *     ever jumps.
 *   - `data` is only ever replaced once a fetch actually *succeeds* — a
 *     year switch does not clear it — so the previously-loaded grid
 *     stays put (no skeleton flash) while the next one loads in the
 *     background, then cross-fades in once ready.
 *   - Only the inner grid + month-labels region animates. It's wrapped
 *     in its own `relative overflow-hidden` box, keyed by `data.startDate`
 *     (changes exactly when fresh data lands) so the transition fires
 *     once per real content change — never on the `year` prop changing
 *     alone, and never affects the card's own dimensions.
 */

// Intensity scale — reuses the app's amber/gold accent instead of GitHub's
// green, so it sits naturally alongside the rest of the profile.
const LEVELS = [
  "bg-white/[0.04]", // 0 contributions
  "bg-amber-900/60", // 1
  "bg-amber-700/70", // 2-3
  "bg-amber-500/80", // 4-6
  "bg-amber-400", // 7+
];

function levelFor(count) {
  if (!count) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Builds a Sunday-start week grid spanning [startDate, endDate].
 * Days before `startDate` (added so the grid begins on a Sunday) are
 * returned with count: null and are rendered as invisible spacers.
 */
function buildWeeks(startDate, endDate, counts) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  const paddedStart = new Date(start);
  paddedStart.setUTCDate(paddedStart.getUTCDate() - paddedStart.getUTCDay());

  const days = [];
  const cursor = new Date(paddedStart);

  while (cursor <= end) {
    const iso = cursor.toISOString().slice(0, 10);
    const inRange = cursor >= start;
    days.push({
      date: iso,
      count: inRange ? counts[iso] ?? 0 : null,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

/**
 * One label per week-column: returns the month name only on the column
 * where that month first appears, GitHub-style. Pulled out as a plain
 * helper (rather than computed inline during render) so the running
 * "last month seen" tracker isn't a render-scoped mutation.
 */
function buildMonthLabels(weeks) {
  let lastMonth = null;
  return weeks.map((week) => {
    const firstRealDay = week.find((d) => d.count !== null);
    if (!firstRealDay) return null;
    const month = new Date(`${firstRealDay.date}T00:00:00Z`).getUTCMonth();
    if (month === lastMonth) return null;
    lastMonth = month;
    return MONTH_NAMES[month];
  });
}

// Fixed card height — chosen to comfortably fit the header line, the
// grid (month-label row + 7 rows of 11px cells), and the legend footer,
// so the card is exactly this tall whether it's showing a skeleton, an
// error, or real data. This is what stops the "collapse and jerk" when
// switching years.
const CARD_MIN_HEIGHT = "min-h-[230px]";

export function HeatmapSkeleton() {
  return (
    <div className={`rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 ${CARD_MIN_HEIGHT}`}>
      <div className="h-4 w-40 rounded bg-white/[0.06] animate-pulse mb-5" />
      <div className="h-28 w-full rounded-lg bg-white/[0.04] animate-pulse" />
      <div className="flex items-center justify-end gap-1.5 mt-4">
        <div className="h-3 w-16 rounded bg-white/[0.05] animate-pulse" />
      </div>
    </div>
  );
}

/**
 * Cross-fade + subtle directional-momentum variants for the inner grid
 * only. Small (12px) offset so this reads as a cross-fade, not a swipe,
 * and stays fully inside the grid's own `overflow-hidden` box.
 */
const gridVariants = {
  enter: (direction) => ({
    opacity: 0,
    x: direction > 0 ? 12 : direction < 0 ? -12 : 0,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (direction) => ({
    opacity: 0,
    x: direction > 0 ? -12 : direction < 0 ? 12 : 0,
  }),
};

/**
 * @param {string} username
 * @param {number|null} year
 * @param {number} [direction] - -1 = came from a later year (slide/fade
 *   in from the left), 1 = came from an earlier year (slide/fade in from
 *   the right), 0 = no directional cue (e.g. first load).
 */
export default function ContributionHeatmap({ username, year, direction = 0 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchHeatmap = async () => {
      setLoading(true);
      setError(false);

      try {
        const url = year
          ? `/api/users/${username}/activity-heatmap?year=${year}`
          : `/api/users/${username}/activity-heatmap`;
        const res = await api.get(url);
        // Only ever replace `data` on success — a year switch never
        // clears the previously-loaded grid, so the card never collapses
        // to a skeleton mid-transition.
        if (!cancelled) setData(res.data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchHeatmap();
    return () => {
      cancelled = true;
    };
  }, [username, year]);

  let weeks = [];
  let monthLabels = [];
  let label = "";

  if (data) {
    weeks = buildWeeks(data.startDate, data.endDate, data.counts);
    const total = Object.values(data.counts).reduce((sum, n) => sum + n, 0);
    monthLabels = buildMonthLabels(weeks);

    // The backend returns the same {year, startDate, endDate} shape for
    // both window types — whether this is a full calendar year or a
    // rolling 365-day window is derived from the dates themselves, not a
    // separate flag.
    const isFullCalendarYear =
      data.year != null &&
      data.startDate === `${data.year}-01-01` &&
      data.endDate === `${data.year}-12-31`;

    label = isFullCalendarYear
      ? `${total} contribution${total === 1 ? "" : "s"} in ${data.year}`
      : `${total} contribution${total === 1 ? "" : "s"} in the last year`;
  }

  return (
    <div className={`rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 ${CARD_MIN_HEIGHT}`}>
      {/* Header slot — always rendered here, never unmounted. Once data
          has loaded at least once, it keeps showing the last-known label
          (even mid-refetch) instead of flashing a skeleton every switch. */}
      <div className="mb-5">
        {data ? (
          <p className="text-sm text-gray-400">{label}</p>
        ) : loading ? (
          <div className="h-4 w-40 rounded bg-white/[0.06] animate-pulse" />
        ) : (
          <p className="text-sm text-gray-500">Couldn't load contribution activity.</p>
        )}
      </div>

      {/* Only this inner region animates. `relative overflow-hidden`
          bounds the small directional slide so it can never widen or
          shift the card itself. */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          {data ? (
            <motion.div
              key={data.startDate}
              custom={direction}
              variants={gridVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-x-auto custom-scroll"
            >
              <div className="inline-block min-w-full">
                <div className="flex gap-[3px] mb-1">
                  {weeks.map((_, i) => (
                    <div
                      key={i}
                      className="w-[11px] shrink-0 text-[10px] leading-none text-gray-500 whitespace-nowrap"
                    >
                      {monthLabels[i] || ""}
                    </div>
                  ))}
                </div>

                <div className="flex gap-[3px]">
                  {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-[3px]">
                      {week.map((day, di) =>
                        day.count === null ? (
                          <div key={di} className="w-[11px] h-[11px]" />
                        ) : (
                          <div
                            key={di}
                            title={`${day.count} contribution${day.count === 1 ? "" : "s"} on ${day.date}`}
                            className={`w-[11px] h-[11px] rounded-[2px] ${LEVELS[levelFor(day.count)]}`}
                          />
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="grid-empty" className="h-28 w-full rounded-lg bg-white/[0.04] animate-pulse" />
          )}
        </AnimatePresence>
      </div>

      {/* Legend footer — always rendered, static, part of the fixed
          outer card. */}
      <div className="flex items-center justify-end gap-1.5 mt-4 text-[11px] text-gray-500">
        <span>Less</span>
        {LEVELS.map((cls, i) => (
          <div key={i} className={`w-[11px] h-[11px] rounded-[2px] ${cls}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}