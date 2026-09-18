import Contribution from "../models/Contribution.js";

/**
 * getContributionYears
 *
 * All distinct calendar years (UTC) a user has at least one contribution
 * in, newest first. Shared by the year selector, the heatmap, and the
 * activity graph so "what years exist" is computed in exactly one place.
 */
export async function getContributionYears(userId) {
  const years = await Contribution.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: { $year: { date: "$createdAtGithub", timezone: "UTC" } },
      },
    },
    { $sort: { _id: -1 } },
  ]);

  return years.map((y) => y._id);
}

/**
 * getContributionWindow
 *
 * Single source of truth for "which date range does the selected year
 * mean" — used by BOTH the heatmap and the trend graph so the two views
 * can never drift apart:
 *
 *   - The requested year IS the actual current calendar year (real
 *     "now", UTC — never derived from contribution data): rolling
 *     365-day window ending "now". This is what makes the current year
 *     behave like a live trailing window instead of stopping at Dec 31.
 *   - Any other year — including the newest year that happens to have
 *     data, if that year is NOT the actual current calendar year (e.g.
 *     no contributions yet this year, so the newest data is last year):
 *     the full calendar year, Jan 1 00:00:00 UTC → Dec 31 23:59:59.999
 *     UTC.
 *
 * Whether a year "counts" as current is intentionally never inferred
 * from the data (latest contribution date, newest year with activity,
 * etc.) — only from the real clock. A year with zero contributions
 * still correctly gets the rolling window if it IS the current
 * calendar year (so the page has sensible current-year behavior even
 * for a brand-new user with no activity at all), and a year with the
 * most recent activity still correctly gets a plain Jan-Dec window if
 * it is NOT the current calendar year.
 *
 * Returns { year, startDate, endDate } where startDate/endDate are Date
 * objects (UTC) ready to drop straight into a Mongo $match.
 */
export async function getContributionWindow(userId, requestedYear) {
  const years = await getContributionYears(userId);
  const newestYear = years[0] ?? null;

  // Real calendar "now" — the only thing allowed to define "current year".
  const currentCalendarYear = new Date().getUTCFullYear();

  const year = Number.isInteger(requestedYear)
    ? requestedYear
    : newestYear ?? currentCalendarYear;

  let startDate, endDate;

  if (year === currentCalendarYear) {
    endDate = new Date();
    endDate.setUTCHours(23, 59, 59, 999);

    startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - 364);
    startDate.setUTCHours(0, 0, 0, 0);
  } else {
    startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  }

  return { year, startDate, endDate };
}