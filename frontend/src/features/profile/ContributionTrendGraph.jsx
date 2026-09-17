import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import api from "../../lib/api";

/**
 * ContributionTrendGraph
 *
 * A traditional time-series line/area chart — X axis is date, Y axis is
 * contribution count on that date — sitting BELOW the existing
 * GitHub-style heatmap. This is deliberately NOT a calendar grid; it's
 * the Codeforces/LeetCode-rating-graph style trend view.
 *
 * Data comes from GET /api/users/:username/activity-graph, which shares
 * the exact same date-window logic as the heatmap (see
 * backend/utils/contributionWindow.js): a rolling 365-day window ending
 * "now" for the newest year with data, or the full Jan 1–Dec 31 calendar
 * year for any older, completed year. Passing `year` keeps this chart in
 * lockstep with the heatmap's year selector. The endpoint returns ONLY
 * dates that have at least one contribution, plus a single zero-value
 * padding point right before the first one — inactive days in between
 * are never zero-filled, and the series never extends past the last
 * actual contribution in the window.
 * Points are plotted as contribution events and connected directly
 * (e.g. 1 → 2 → 1), the same way a rating-history graph only plots
 * actual matches rather than every calendar day in between.
 *
 * IMPORTANT: the X axis is a true numeric time scale (timestamps), not
 * an evenly-spaced category axis. Recharts' default category axis
 * spaces points by *index*, which would make a 3-day gap and a 3-month
 * gap look identical — that's wrong for this data, since a big real
 * gap should visually stretch further than a small one. Converting the
 * dates to timestamps and using a numeric/time domain keeps horizontal
 * spacing proportional to elapsed calendar time even though only
 * active days are plotted.
 *
 * Layout stability & fade-in:
 *   - The outer card (border, background, padding, header, fixed
 *     `min-h`) always renders with the same structure for every state —
 *     first load, a year switch, an error, or "no contributions" — so it
 *     never resizes or jumps whatever's below it.
 *   - `series` is only ever replaced once a fetch actually *succeeds* —
 *     picking a new year doesn't clear it — so the previous chart stays
 *     on screen while the next one loads, rather than flashing a
 *     skeleton on every switch.
 *   - Only the inner `h-64` chart wrapper animates: a plain opacity-only
 *     fade (no translate/slide), keyed by `year` so it fades in fresh on
 *     the very first mount (arriving at the Activity tab) AND every
 *     subsequent year change, per the requested behavior.
 */

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatShortDate(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function formatFullDate(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function isoFromTimestamp(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { date, count } = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/10 bg-gray-900/95 px-3 py-2 text-xs shadow-lg">
      <div className="text-gray-400 mb-0.5">{formatFullDate(date)}</div>
      <div className="text-white font-medium">
        {count} contribution{count === 1 ? "" : "s"}
      </div>
    </div>
  );
}

// Fixed card height — header line + h-64 (256px) chart + padding, so the
// card is exactly this tall for every state (skeleton, error, empty,
// loaded). This is what keeps it from resizing/jumping on a year switch.
const CARD_MIN_HEIGHT = "min-h-[350px]";

export function TrendGraphSkeleton() {
  return (
    <div className={`rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 ${CARD_MIN_HEIGHT}`}>
      <div className="h-4 w-56 rounded bg-white/[0.06] animate-pulse mb-5" />
      <div className="h-64 w-full rounded-lg bg-white/[0.04] animate-pulse" />
    </div>
  );
}

// Round a Y-axis max up to a "nice" number so ticks land on clean values
// instead of arbitrary data-dependent ones.
function niceMax(rawMax) {
  if (rawMax <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawMax));
  const normalized = rawMax / magnitude;
  let niceNormalized;
  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 5) niceNormalized = 5;
  else niceNormalized = 10;
  return niceNormalized * magnitude;
}

export default function ContributionTrendGraph({ username, year }) {
  const [series, setSeries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchGraph = async () => {
      setLoading(true);
      setError(false);

      try {
        const url = year
          ? `/api/users/${username}/activity-graph?year=${year}`
          : `/api/users/${username}/activity-graph`;
        const res = await api.get(url);
        // Only ever replace `series` on success — switching years never
        // clears the previously-loaded chart, so the card never
        // collapses to a skeleton mid-transition.
        if (!cancelled) setSeries(res.data.series ?? []);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchGraph();
    return () => {
      cancelled = true;
    };
  }, [username, year]);

  // Chart-ready data: same points as `series`, with a numeric timestamp
  // added so the X axis can use a true time scale instead of index-based
  // category spacing. Chronological order is preserved as-is from the
  // backend (already sorted).
  const chartData = useMemo(
    () =>
      (series ?? []).map((d) => ({
        ...d,
        timestamp: new Date(`${d.date}T00:00:00Z`).getTime(),
      })),
    [series]
  );

  const { total, peak, yMax, rangeLabel } = useMemo(() => {
    if (!series?.length) return { total: 0, peak: 0, yMax: 4, rangeLabel: "" };

    const totals = series.reduce(
      (acc, d) => ({
        total: acc.total + d.count,
        peak: Math.max(acc.peak, d.count),
      }),
      { total: 0, peak: 0 }
    );

    const first = series[0].date;
    const last = series[series.length - 1].date;
    const label =
      first === last ? formatFullDate(first) : `${formatShortDate(first)} – ${formatFullDate(last)}`;

    return { ...totals, yMax: niceMax(totals.peak), rangeLabel: label };
  }, [series]);

  // Everything below is rendered inside ONE consistently-shaped outer
  // card, for every state, so it never remounts/resizes as a whole —
  // only the labeled inner region changes.
  let body;

  if (!series && loading) {
    body = (
      <>
        <div className="h-4 w-56 rounded bg-white/[0.06] animate-pulse mb-5" />
        <div className="h-64 w-full rounded-lg bg-white/[0.04] animate-pulse" />
      </>
    );
  } else if (!series && error) {
    body = <p className="text-sm text-gray-500">Couldn't load the contribution trend.</p>;
  } else if (!series?.length) {
    body = (
      <p className="text-sm text-gray-500">
        No contributions {year ? `in ${year}` : "yet"} — this chart will fill in once activity starts.
      </p>
    );
  } else {
    body = (
      <>
        <div className="flex items-baseline justify-between mb-5">
          <p className="text-sm text-gray-400">
            {total.toLocaleString()} contribution{total === 1 ? "" : "s"} · {rangeLabel}
          </p>
          <p className="text-[11px] text-gray-500">Peak: {peak}/day</p>
        </div>

        {/* Pure opacity fade-in only — no translate/slide. Keyed by
            `year` so it fades in fresh both on first arrival at the
            Activity tab and on every subsequent year change. */}
        <motion.div
          key={year ?? "current"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="h-64 w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                {/* Multi-stop gradient: solid near the line, fading to
                    fully transparent at the baseline — gives the fill
                    real visual weight instead of a faint tint. */}
                <linearGradient id="contributionTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.75} />
                  <stop offset="30%" stopColor="#fbbf24" stopOpacity={0.42} />
                  <stop offset="70%" stopColor="#fbbf24" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.03} />
                </linearGradient>

                {/* Soft glow behind the line itself, à la Vercel/Linear
                    analytics charts. */}
                <filter id="contributionLineGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />

              {/*
                type="number" + scale via timestamps: a real chronological
                time axis. A gap of a few months between two active points
                stretches proportionally further than a gap of a few days —
                unlike the default category axis, which would space every
                plotted point evenly regardless of how far apart the actual
                dates are.
              */}
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(ts) => formatShortDate(isoFromTimestamp(ts))}
                tickCount={6}
                tick={{ fill: "#6b7280", fontSize: 11 }}
                axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                tickLine={false}
              />

              <YAxis
                domain={[0, yMax]}
                allowDecimals={false}
                allowDataOverflow
                tickCount={5}
                tick={{ fill: "#6b7280", fontSize: 11 }}
                axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                tickLine={false}
                width={32}
              />

              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(251,191,36,0.3)" }} />

              {/*
                type="monotone" — NOT "natural".
                "natural" fits a global cubic spline through every point,
                which can overshoot past a neighboring value and dip below
                the 0 baseline. "monotone" (Fritsch–Carlson monotone cubic
                interpolation) is mathematically guaranteed to never
                over/undershoot past the value of its neighboring points,
                so the curve stays smooth without ever crossing below 0.
              */}
              <Area
                type="monotone"
                dataKey="count"
                stroke="#fbbf24"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="url(#contributionTrendFill)"
                fillOpacity={1}
                baseValue={0}
                dot={{ r: 3, fill: "#0a0a0a", stroke: "#fbbf24", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: "#fbbf24", stroke: "#0a0a0a", strokeWidth: 2 }}
                style={{ filter: "url(#contributionLineGlow)" }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </>
    );
  }

  return (
    <div className={`rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 ${CARD_MIN_HEIGHT}`}>
      {body}
    </div>
  );
}