import { useEffect, useState } from "react";
import { GitPullRequest, FolderKanban, CalendarCheck, Trophy } from "lucide-react";
import api from "../../lib/api";

/**
 * ActivityStatsCards
 *
 * Top-of-page stat cards for the Activity dashboard. Data comes from
 * GET /api/users/:username/activity-stats, which is fully backend
 * computed (MongoDB aggregation) — this component just renders it.
 *
 * Intentionally limited to 4 metrics — Total Contributions, Total
 * Collections, Active Days, Longest Streak — since ContriHub is a
 * portfolio platform, not a coding-practice/streak-tracking one.
 * "Current Streak" and per-year/per-month counts were dropped as
 * lower-signal for that use case.
 */

// `unit`, when set, is appended as " day"/" days" based on the value.
const CARD_DEFS = [
  { key: "totalContributions", label: "Total Contributions", icon: GitPullRequest },
  { key: "totalCollections", label: "Total Collections", icon: FolderKanban },
  { key: "activeDays", label: "Active Days", icon: CalendarCheck, unit: "day" },
  { key: "longestStreak", label: "Longest Streak", icon: Trophy, unit: "day" },
];

// 2 columns on mobile (2x2), 4 across from tablet width up — balanced
// for exactly 4 cards at every breakpoint, no orphaned/half-empty rows.
const GRID_CLASSES = "grid grid-cols-2 sm:grid-cols-4 gap-3";

export function StatsCardsSkeleton() {
  return (
    <div className={GRID_CLASSES}>
      {CARD_DEFS.map((def) => (
        <div
          key={def.key}
          className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 animate-pulse"
        >
          <div className="h-3 w-20 rounded bg-white/[0.06] mb-3" />
          <div className="h-6 w-12 rounded bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

export default function ActivityStatsCards({ username }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      setLoading(true);
      setError(false);

      try {
        const res = await api.get(`/api/users/${username}/activity-stats`);
        if (!cancelled) setStats(res.data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (loading) return <StatsCardsSkeleton />;

  if (error || !stats) {
    return (
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6 text-sm text-gray-500">
        Couldn't load activity stats.
      </div>
    );
  }

  return (
    <div className={GRID_CLASSES}>
      {CARD_DEFS.map(({ key, label, icon: Icon, unit }) => {
        const value = stats[key] ?? 0;
        return (
          <div
            key={key}
            className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors"
          >
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-gray-500 mb-2">
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </div>
            <div className="text-2xl font-semibold text-white">
              {value.toLocaleString()}
              {unit && (
                <span className="text-sm font-normal text-gray-400 ml-1">
                  {unit}
                  {value === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}